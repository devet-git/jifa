package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

type rateBucket struct {
	tokens     float64
	lastRefill time.Time
	mu         sync.Mutex
}

var buckets sync.Map

const (
	ratePerSec = 1.0
	burstMax   = 30.0
)

// RateLimit enforces a per-user token-bucket rate limit (30 burst, 1/sec
// refill). Must run after the Auth middleware so userID is set.
func RateLimit() gin.HandlerFunc {
	return func(c *gin.Context) {
		uid, exists := c.Get("userID")
		if !exists {
			c.Next()
			return
		}
		key := uid.(uint)

		val, _ := buckets.LoadOrStore(key, &rateBucket{tokens: burstMax, lastRefill: time.Now()})
		bucket := val.(*rateBucket)

		bucket.mu.Lock()
		now := time.Now()
		elapsed := now.Sub(bucket.lastRefill).Seconds()
		bucket.tokens += elapsed * ratePerSec
		if bucket.tokens > burstMax {
			bucket.tokens = burstMax
		}
		bucket.lastRefill = now

		if bucket.tokens < 1 {
			bucket.mu.Unlock()
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": "rate limit exceeded"})
			return
		}
		bucket.tokens--
		bucket.mu.Unlock()
		c.Next()
	}
}
