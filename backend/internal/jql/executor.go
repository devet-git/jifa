package jql

import (
	"fmt"
	"strings"

	"jifa/backend/internal/models"

	"gorm.io/gorm"
)

// Execute parses the query and runs it against the issues table, scoped to
// projects the user has access to. Returns the matching issues (max 200).
func Execute(db *gorm.DB, query string, userID uint) ([]models.Issue, error) {
	ast, err := Parse(query)
	if err != nil {
		return nil, err
	}
	q := baseQuery(db, userID)
	q, err = apply(q, ast, userID)
	if err != nil {
		return nil, err
	}
	var issues []models.Issue
	q.Preload("Assignee").Preload("Reporter").Preload("Project").
		Order("issues.updated_at DESC").
		Limit(200).
		Find(&issues)
	return issues, nil
}

func baseQuery(db *gorm.DB, userID uint) *gorm.DB {
	return db.Model(&models.Issue{}).
		Joins("LEFT JOIN members m ON m.project_id = issues.project_id AND m.deleted_at IS NULL").
		Joins("LEFT JOIN projects p_acl ON p_acl.id = issues.project_id").
		Where("p_acl.owner_id = ? OR m.user_id = ?", userID, userID).
		Distinct("issues.*")
}

func apply(q *gorm.DB, node Node, userID uint) (*gorm.DB, error) {
	switch n := node.(type) {
	case Clause:
		return applyClause(q, n, userID)
	case BoolExpr:
		return applyBool(q, n, userID)
	}
	return q, fmt.Errorf("unknown node type")
}

func applyBool(q *gorm.DB, n BoolExpr, userID uint) (*gorm.DB, error) {
	leftCond, leftArgs, err := buildCondition(n.Left, userID)
	if err != nil {
		return nil, err
	}
	rightCond, rightArgs, err := buildCondition(n.Right, userID)
	if err != nil {
		return nil, err
	}
	join := " AND "
	if n.Op == "OR" {
		join = " OR "
	}
	cond := "(" + leftCond + join + rightCond + ")"
	args := append([]any{}, leftArgs...)
	args = append(args, rightArgs...)
	return q.Where(cond, args...), nil
}

// buildCondition compiles any node into a (sql, args) pair without applying
// it. Lets us compose AND/OR groups inside a single Where call so precedence
// stays correct.
func buildCondition(node Node, userID uint) (string, []any, error) {
	switch n := node.(type) {
	case Clause:
		return clauseSQL(n, userID)
	case BoolExpr:
		l, la, err := buildCondition(n.Left, userID)
		if err != nil {
			return "", nil, err
		}
		r, ra, err := buildCondition(n.Right, userID)
		if err != nil {
			return "", nil, err
		}
		join := " AND "
		if n.Op == "OR" {
			join = " OR "
		}
		args := append([]any{}, la...)
		args = append(args, ra...)
		return "(" + l + join + r + ")", args, nil
	}
	return "", nil, fmt.Errorf("unknown node type")
}

func applyClause(q *gorm.DB, c Clause, userID uint) (*gorm.DB, error) {
	cond, args, err := clauseSQL(c, userID)
	if err != nil {
		return nil, err
	}
	return q.Where(cond, args...), nil
}

func clauseSQL(c Clause, userID uint) (string, []any, error) {
	switch c.Field {
	case "text":
		// text ~ "foo" => title/description ILIKE %foo%
		if c.Op != OpLike {
			return "", nil, fmt.Errorf("text only supports ~")
		}
		like := "%" + strings.ToLower(c.Value.Text) + "%"
		return "(LOWER(issues.title) LIKE ? OR LOWER(issues.description) LIKE ?)", []any{like, like}, nil

	case "key":
		// key = "PROJ-42" → project key + number
		if c.Op != OpEq {
			return "", nil, fmt.Errorf("key only supports =")
		}
		parts := strings.SplitN(c.Value.Text, "-", 2)
		if len(parts) != 2 {
			return "", nil, fmt.Errorf("invalid key %q", c.Value.Text)
		}
		return "p_acl.key = ? AND issues.number = ?", []any{parts[0], parts[1]}, nil

	case "assignee", "reporter":
		col := "issues.assignee_id"
		if c.Field == "reporter" {
			col = "issues.reporter_id"
		}
		return userValueClause(col, c, userID)

	case "status", "priority", "type":
		col := "issues." + c.Field
		return stringValueClause(col, c)

	case "sprint":
		col := "issues.sprint_id"
		return joinedLookupClause(col,
			`SELECT id FROM sprints WHERE name = ? AND deleted_at IS NULL LIMIT 1`,
			c)

	case "version":
		col := "issues.version_id"
		return joinedLookupClause(col,
			`SELECT id FROM versions WHERE name = ? AND deleted_at IS NULL LIMIT 1`,
			c)

	case "label":
		// label = "foo" → exists relation
		v, err := singleValue(c)
		if err != nil {
			return "", nil, err
		}
		sub := `EXISTS (
			SELECT 1 FROM issue_labels il
			JOIN labels l ON l.id = il.label_id
			WHERE il.issue_id = issues.id AND l.name = ?
		)`
		if c.Op == OpNe {
			return "NOT " + sub, []any{v}, nil
		}
		return sub, []any{v}, nil

	case "component":
		v, err := singleValue(c)
		if err != nil {
			return "", nil, err
		}
		sub := `EXISTS (
			SELECT 1 FROM issue_components ic
			JOIN components co ON co.id = ic.component_id
			WHERE ic.issue_id = issues.id AND co.name = ?
		)`
		if c.Op == OpNe {
			return "NOT " + sub, []any{v}, nil
		}
		return sub, []any{v}, nil
	}
	return "", nil, fmt.Errorf("unknown field %q", c.Field)
}

func stringValueClause(col string, c Clause) (string, []any, error) {
	switch c.Op {
	case OpEq:
		return col + " = ?", []any{c.Value.Text}, nil
	case OpNe:
		return col + " <> ?", []any{c.Value.Text}, nil
	case OpIn:
		return col + " IN ?", []any{valueTexts(c.Values)}, nil
	case OpNotIn:
		return col + " NOT IN ?", []any{valueTexts(c.Values)}, nil
	}
	return "", nil, fmt.Errorf("op %s not supported on %s", c.Op, col)
}

func joinedLookupClause(col, sub string, c Clause) (string, []any, error) {
	v, err := singleValue(c)
	if err != nil {
		return "", nil, err
	}
	switch c.Op {
	case OpEq:
		return col + " = (" + sub + ")", []any{v}, nil
	case OpNe:
		return "(" + col + " IS NULL OR " + col + " <> (" + sub + "))", []any{v}, nil
	}
	return "", nil, fmt.Errorf("op %s not supported", c.Op)
}

func userValueClause(col string, c Clause, userID uint) (string, []any, error) {
	resolve := func(v Value) any {
		if v.Bare && strings.EqualFold(v.Text, "me") {
			return userID
		}
		if v.Bare && strings.EqualFold(v.Text, "null") {
			return nil
		}
		// Try email → id lookup via subquery; otherwise treat as numeric.
		return any(v.Text)
	}
	switch c.Op {
	case OpEq:
		v := resolve(c.Value)
		if v == nil {
			return col + " IS NULL", nil, nil
		}
		if uid, ok := v.(uint); ok {
			return col + " = ?", []any{uid}, nil
		}
		// email path
		return col + " = (SELECT id FROM users WHERE email = ? LIMIT 1)", []any{v}, nil
	case OpNe:
		v := resolve(c.Value)
		if v == nil {
			return col + " IS NOT NULL", nil, nil
		}
		if uid, ok := v.(uint); ok {
			return "(" + col + " IS NULL OR " + col + " <> ?)", []any{uid}, nil
		}
		return "(" + col + " IS NULL OR " + col + " <> (SELECT id FROM users WHERE email = ? LIMIT 1))", []any{v}, nil
	case OpIn:
		emails := valueTexts(c.Values)
		return col + " IN (SELECT id FROM users WHERE email IN ?)", []any{emails}, nil
	case OpNotIn:
		emails := valueTexts(c.Values)
		return "(" + col + " IS NULL OR " + col + " NOT IN (SELECT id FROM users WHERE email IN ?))", []any{emails}, nil
	}
	return "", nil, fmt.Errorf("op %s not supported on user field", c.Op)
}

func singleValue(c Clause) (string, error) {
	if c.Op == OpIn || c.Op == OpNotIn {
		return "", fmt.Errorf("%s field doesn't accept IN", c.Field)
	}
	return c.Value.Text, nil
}

func valueTexts(vs []Value) []string {
	out := make([]string, len(vs))
	for i, v := range vs {
		out[i] = v.Text
	}
	return out
}
