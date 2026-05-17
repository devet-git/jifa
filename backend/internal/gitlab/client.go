package gitlab

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

var defaultHTTP = &http.Client{Timeout: 10 * time.Second}

type Client struct {
	BaseURL string
	Token   string
	http    *http.Client
}

func NewClient(baseURL, token string) *Client {
	return &Client{
		BaseURL: strings.TrimRight(baseURL, "/"),
		Token:   token,
		http:    defaultHTTP,
	}
}

type Project struct {
	ID            int    `json:"id"`
	Name          string `json:"name"`
	PathWithSpace string `json:"path_with_namespace"`
	WebURL        string `json:"web_url"`
}

type MergeRequest struct {
	IID         int       `json:"iid"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	State       string    `json:"state"`
	WebURL      string    `json:"web_url"`
	Author      User      `json:"author"`
	SourceBranch string   `json:"source_branch"`
	TargetBranch string   `json:"target_branch"`
	CreatedAt   time.Time `json:"created_at"`
}

type User struct {
	Name     string `json:"name"`
	Username string `json:"username"`
}

type Branch struct {
	Name   string `json:"name"`
	WebURL string `json:"web_url"`
}

// Ping returns the authenticated user's name; used to validate a token.
func (c *Client) Ping(ctx context.Context) (string, error) {
	var u User
	if err := c.do(ctx, http.MethodGet, "/api/v4/user", nil, &u); err != nil {
		return "", err
	}
	if u.Name == "" {
		return u.Username, nil
	}
	return u.Name, nil
}

func (c *Client) GetProjectByPath(ctx context.Context, path string) (*Project, error) {
	var p Project
	endpoint := "/api/v4/projects/" + url.PathEscape(path)
	if err := c.do(ctx, http.MethodGet, endpoint, nil, &p); err != nil {
		return nil, err
	}
	return &p, nil
}

func (c *Client) GetMergeRequest(ctx context.Context, projectID, iid int) (*MergeRequest, error) {
	var mr MergeRequest
	endpoint := fmt.Sprintf("/api/v4/projects/%d/merge_requests/%d", projectID, iid)
	if err := c.do(ctx, http.MethodGet, endpoint, nil, &mr); err != nil {
		return nil, err
	}
	return &mr, nil
}

// ListBranches calls GitLab's branches endpoint. perPage is capped at 100.
func (c *Client) ListBranches(ctx context.Context, projectID int, search string, perPage int) ([]Branch, error) {
	if perPage <= 0 || perPage > 100 {
		perPage = 100
	}
	endpoint := fmt.Sprintf("/api/v4/projects/%d/repository/branches?per_page=%d", projectID, perPage)
	if search != "" {
		endpoint += "&search=" + url.QueryEscape(search)
	}
	var out []Branch
	if err := c.do(ctx, http.MethodGet, endpoint, nil, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (c *Client) CreateBranch(ctx context.Context, projectID int, name, ref string) (*Branch, error) {
	var b Branch
	endpoint := fmt.Sprintf("/api/v4/projects/%d/repository/branches?branch=%s&ref=%s",
		projectID, url.QueryEscape(name), url.QueryEscape(ref))
	if err := c.do(ctx, http.MethodPost, endpoint, nil, &b); err != nil {
		return nil, err
	}
	return &b, nil
}

func (c *Client) do(ctx context.Context, method, path string, body any, out any) error {
	var reader io.Reader
	if body != nil {
		buf, err := json.Marshal(body)
		if err != nil {
			return err
		}
		reader = bytes.NewReader(buf)
	}
	req, err := http.NewRequestWithContext(ctx, method, c.BaseURL+path, reader)
	if err != nil {
		return err
	}
	req.Header.Set("PRIVATE-TOKEN", c.Token)
	req.Header.Set("Accept", "application/json")
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		buf, _ := io.ReadAll(io.LimitReader(resp.Body, 2048))
		return &APIError{
			Status: resp.StatusCode,
			Body:   strings.TrimSpace(string(buf)),
		}
	}
	if out == nil {
		return nil
	}
	return json.NewDecoder(resp.Body).Decode(out)
}

type APIError struct {
	Status int
	Body   string
}

func (e *APIError) Error() string {
	return "gitlab api: status " + strconv.Itoa(e.Status) + ": " + e.Body
}
