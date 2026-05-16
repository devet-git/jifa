package handlers

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
)

// respondInternalError logs the underlying error to the server log and
// returns a generic 500 to the client. Use this for any non-user-facing
// failure (DB errors, FK violations, IO errors, etc.) — the original
// message can leak schema or implementation details and must not reach
// the UI.
//
// `op` is a short, stable identifier of what failed (e.g. "project.delete"
// or "issue.create"). It's prepended to the log line so the log file can be
// grep'd for a specific failure path. Pass an empty string to omit it.
func respondInternalError(c *gin.Context, op string, err error) {
	if err != nil {
		if op == "" {
			log.Printf("[error] method=%s path=%s user=%v err=%v",
				c.Request.Method,
				c.Request.URL.Path,
				c.GetUint("userID"),
				err,
			)
		} else {
			log.Printf("[error] %s: method=%s path=%s user=%v err=%v",
				op,
				c.Request.Method,
				c.Request.URL.Path,
				c.GetUint("userID"),
				err,
			)
		}
	}
	c.JSON(http.StatusInternalServerError, gin.H{
		"error": "An internal server error occurred. Please try again later.",
	})
}

// respondInternal is a shorthand for respondInternalError(c, "", err) —
// the request method/path/user already identify the call site.
func respondInternal(c *gin.Context, err error) {
	respondInternalError(c, "", err)
}
