package gitlab

import (
	"reflect"
	"testing"
)

func TestExtractIssueKeys(t *testing.T) {
	tests := []struct {
		name       string
		text       string
		projectKey string
		want       []string
	}{
		{"simple match", "Fixes JIFA-1", "JIFA", []string{"JIFA-1"}},
		{"multiple keys", "refs JIFA-1 JIFA-2", "JIFA", []string{"JIFA-1", "JIFA-2"}},
		{"lowercase normalised", "jifa-1 fix done", "JIFA", []string{"JIFA-1"}},
		{"mixed case", "Fix Jifa-7", "JIFA", []string{"JIFA-7"}},
		{"different project key dropped", "Fixes OTHER-1", "JIFA", nil},
		{"duplicate de-duplicated", "JIFA-1 JIFA-1 JIFA-1", "JIFA", []string{"JIFA-1"}},
		{"empty text", "", "JIFA", nil},
		{"empty project key", "JIFA-1", "", nil},
		{"no match in noise", "this is a commit message", "JIFA", nil},
		{"key with underscore prefix", "MY_PROJ-9 done", "MY_PROJ", []string{"MY_PROJ-9"}},
		{"trailing punctuation", "see JIFA-2, JIFA-3.", "JIFA", []string{"JIFA-2", "JIFA-3"}},
		{"key inside word should not match", "WJIFA-1", "JIFA", nil},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := ExtractIssueKeys(tc.text, tc.projectKey)
			if !reflect.DeepEqual(got, tc.want) {
				t.Errorf("ExtractIssueKeys(%q, %q) = %v, want %v", tc.text, tc.projectKey, got, tc.want)
			}
		})
	}
}

func TestExtractCloseRefs(t *testing.T) {
	tests := []struct {
		name       string
		text       string
		projectKey string
		want       []CloseRef
	}{
		{
			name:       "close keyword",
			text:       "Fixes JIFA-1",
			projectKey: "JIFA",
			want:       []CloseRef{{Key: "JIFA-1", Action: ActionClose}},
		},
		{
			name:       "bare reference",
			text:       "see JIFA-1",
			projectKey: "JIFA",
			want:       []CloseRef{{Key: "JIFA-1", Action: ActionRef}},
		},
		{
			name:       "mixed close and ref",
			text:       "Fixes JIFA-1, refs JIFA-2",
			projectKey: "JIFA",
			want: []CloseRef{
				{Key: "JIFA-1", Action: ActionClose},
				{Key: "JIFA-2", Action: ActionRef},
			},
		},
		{
			name:       "multiple close keywords",
			text:       "Fixes JIFA-1 closes JIFA-2 resolves JIFA-3",
			projectKey: "JIFA",
			want: []CloseRef{
				{Key: "JIFA-1", Action: ActionClose},
				{Key: "JIFA-2", Action: ActionClose},
				{Key: "JIFA-3", Action: ActionClose},
			},
		},
		{
			name:       "close keyword wins when conflicting",
			text:       "refs JIFA-1 fixes JIFA-1",
			projectKey: "JIFA",
			want:       []CloseRef{{Key: "JIFA-1", Action: ActionClose}},
		},
		{
			name:       "different project ignored",
			text:       "Fixes OTHER-1",
			projectKey: "JIFA",
			want:       nil,
		},
		{
			name:       "empty",
			text:       "",
			projectKey: "JIFA",
			want:       nil,
		},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := ExtractCloseRefs(tc.text, tc.projectKey)
			if !reflect.DeepEqual(got, tc.want) {
				t.Errorf("ExtractCloseRefs(%q, %q) = %v, want %v", tc.text, tc.projectKey, got, tc.want)
			}
		})
	}
}
