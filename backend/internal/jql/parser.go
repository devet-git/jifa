// Package jql is a tiny query language for Jifa issues. Inspired by Jira's
// JQL, scope intentionally smaller: a single boolean expression over a fixed
// set of fields and operators.
//
// Grammar (top-down):
//
//	expr   = term ( ("AND"|"OR") term )*
//	term   = "(" expr ")" | clause
//	clause = field op value
//	field  = identifier              ; e.g. assignee, status
//	op     = "=" | "!=" | "~" | "IN" | "NOT IN"
//	value  = identifier | string | "(" list ")"
//	list   = value ("," value)*
//
// Keywords are case-insensitive. String literals use double quotes with
// backslash escapes. The bare identifier "me" resolves to the current user.
package jql

import (
	"errors"
	"fmt"
	"strings"
	"unicode"
)

type Op string

const (
	OpEq    Op = "="
	OpNe    Op = "!="
	OpLike  Op = "~"
	OpIn    Op = "IN"
	OpNotIn Op = "NOT IN"
)

// Node is one element of the parsed AST. Either a Clause or a BoolExpr.
type Node interface{ node() }

type Clause struct {
	Field string
	Op    Op
	// Either a single Value or a Values list. Empty Values for "=", "!=", "~".
	Value  Value
	Values []Value
}

type BoolExpr struct {
	Op    string // "AND" | "OR"
	Left  Node
	Right Node
}

func (Clause) node()   {}
func (BoolExpr) node() {}

// Value is the right-hand side of a clause. Special tokens like `me` keep
// their bare form so the executor can resolve them at runtime.
type Value struct {
	Bare bool // true for unquoted tokens (identifiers, numbers, `me`)
	Text string
}

// Parse turns a JQL string into an AST. Returns nil + error on syntax errors.
func Parse(input string) (Node, error) {
	p := &parser{input: input}
	p.advance()
	n, err := p.parseExpr()
	if err != nil {
		return nil, err
	}
	if p.tok.kind != tokEOF {
		return nil, fmt.Errorf("unexpected trailing input near %q", p.tok.text)
	}
	return n, nil
}

// ---- lexer -----------------------------------------------------------

type tokenKind int

const (
	tokEOF tokenKind = iota
	tokIdent
	tokString
	tokOp     // = != ~
	tokLParen // (
	tokRParen // )
	tokComma
)

type token struct {
	kind tokenKind
	text string
}

type parser struct {
	input string
	pos   int
	tok   token
}

func (p *parser) advance() {
	for p.pos < len(p.input) && unicode.IsSpace(rune(p.input[p.pos])) {
		p.pos++
	}
	if p.pos >= len(p.input) {
		p.tok = token{kind: tokEOF}
		return
	}
	ch := p.input[p.pos]
	switch {
	case ch == '(':
		p.pos++
		p.tok = token{kind: tokLParen, text: "("}
	case ch == ')':
		p.pos++
		p.tok = token{kind: tokRParen, text: ")"}
	case ch == ',':
		p.pos++
		p.tok = token{kind: tokComma, text: ","}
	case ch == '=':
		p.pos++
		p.tok = token{kind: tokOp, text: "="}
	case ch == '!':
		if p.pos+1 < len(p.input) && p.input[p.pos+1] == '=' {
			p.pos += 2
			p.tok = token{kind: tokOp, text: "!="}
		} else {
			p.pos++
			p.tok = token{kind: tokOp, text: "!"}
		}
	case ch == '~':
		p.pos++
		p.tok = token{kind: tokOp, text: "~"}
	case ch == '"':
		p.pos++
		var sb strings.Builder
		for p.pos < len(p.input) && p.input[p.pos] != '"' {
			if p.input[p.pos] == '\\' && p.pos+1 < len(p.input) {
				sb.WriteByte(p.input[p.pos+1])
				p.pos += 2
				continue
			}
			sb.WriteByte(p.input[p.pos])
			p.pos++
		}
		if p.pos < len(p.input) {
			p.pos++ // consume closing "
		}
		p.tok = token{kind: tokString, text: sb.String()}
	default:
		start := p.pos
		for p.pos < len(p.input) {
			c := p.input[p.pos]
			if unicode.IsLetter(rune(c)) || unicode.IsDigit(rune(c)) ||
				c == '_' || c == '-' || c == '@' || c == '.' {
				p.pos++
				continue
			}
			break
		}
		if p.pos == start {
			p.pos++
			p.tok = token{kind: tokOp, text: string(ch)}
			return
		}
		p.tok = token{kind: tokIdent, text: p.input[start:p.pos]}
	}
}

// ---- parser ----------------------------------------------------------

func (p *parser) parseExpr() (Node, error) {
	left, err := p.parseTerm()
	if err != nil {
		return nil, err
	}
	for p.tok.kind == tokIdent {
		up := strings.ToUpper(p.tok.text)
		if up != "AND" && up != "OR" {
			break
		}
		p.advance()
		right, err := p.parseTerm()
		if err != nil {
			return nil, err
		}
		left = BoolExpr{Op: up, Left: left, Right: right}
	}
	return left, nil
}

func (p *parser) parseTerm() (Node, error) {
	if p.tok.kind == tokLParen {
		p.advance()
		n, err := p.parseExpr()
		if err != nil {
			return nil, err
		}
		if p.tok.kind != tokRParen {
			return nil, errors.New("missing closing ')'")
		}
		p.advance()
		return n, nil
	}
	return p.parseClause()
}

func (p *parser) parseClause() (Node, error) {
	if p.tok.kind != tokIdent {
		return nil, fmt.Errorf("expected field name, got %q", p.tok.text)
	}
	field := strings.ToLower(p.tok.text)
	p.advance()

	op, err := p.parseOp()
	if err != nil {
		return nil, err
	}

	cl := Clause{Field: field, Op: op}
	switch op {
	case OpIn, OpNotIn:
		if p.tok.kind != tokLParen {
			return nil, errors.New("expected '(' after IN")
		}
		p.advance()
		for {
			v, err := p.parseValue()
			if err != nil {
				return nil, err
			}
			cl.Values = append(cl.Values, v)
			if p.tok.kind == tokComma {
				p.advance()
				continue
			}
			break
		}
		if p.tok.kind != tokRParen {
			return nil, errors.New("missing closing ')' in IN list")
		}
		p.advance()
	default:
		v, err := p.parseValue()
		if err != nil {
			return nil, err
		}
		cl.Value = v
	}
	return cl, nil
}

func (p *parser) parseOp() (Op, error) {
	if p.tok.kind == tokOp {
		switch p.tok.text {
		case "=":
			p.advance()
			return OpEq, nil
		case "!=":
			p.advance()
			return OpNe, nil
		case "~":
			p.advance()
			return OpLike, nil
		}
	}
	if p.tok.kind == tokIdent {
		switch strings.ToUpper(p.tok.text) {
		case "IN":
			p.advance()
			return OpIn, nil
		case "NOT":
			p.advance()
			if p.tok.kind != tokIdent || strings.ToUpper(p.tok.text) != "IN" {
				return "", errors.New("expected 'IN' after 'NOT'")
			}
			p.advance()
			return OpNotIn, nil
		}
	}
	return "", fmt.Errorf("expected operator, got %q", p.tok.text)
}

func (p *parser) parseValue() (Value, error) {
	switch p.tok.kind {
	case tokString:
		v := Value{Text: p.tok.text}
		p.advance()
		return v, nil
	case tokIdent:
		v := Value{Bare: true, Text: p.tok.text}
		p.advance()
		return v, nil
	}
	return Value{}, fmt.Errorf("expected value, got %q", p.tok.text)
}
