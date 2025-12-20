# PhysiScaffold Pilot Launch Plan (10 Users)

## Current Architecture Assessment

### ✅ What's Working
- Core Socratic teaching engine (Progressive Hint Ladder)
- Problem solving flow with prerequisites check
- Mistake pattern tracking
- Reflection and variations
- Study path with curated problems
- Concept network visualization
- Problem history tracking (localStorage)

### ⚠️ Critical Issues for Pilot

#### 1. **API Cost Control** (CRITICAL)
**Problem**: No limits on API usage. Each problem costs $0.10-0.30 in Claude API calls.
- Scaffold generation: ~30s, ~3000 tokens
- Hint generation (5 levels): ~15s, ~1500 tokens
- Reflection: ~5s, ~500 tokens
- Variations: ~10s, ~1000 tokens
- Prerequisites: ~13s, ~1000 tokens

**Risk**: 10 users solving 5 problems/day = 50 API calls/day = ~$15-20/day = $450-600/month

**Solution**:
- Implement per-user daily limits
- Add usage tracking
- Cache common problems
- Implement "credits" system

#### 2. **No Authentication** (HIGH)
**Problem**: Anyone can use the app, no user identification
**Impact**:
- Cannot track individual usage
- Cannot enforce per-user limits
- Cannot save progress across devices
- Cannot provide personalized experience

**Solution**: Simple auth system (email-based or passkey)

#### 3. **Data Persistence** (MEDIUM)
**Problem**: All data in localStorage (client-side only)
**Impact**:
- Data lost if browser cache cleared
- Cannot sync across devices
- Cannot track user progress server-side

**Solution**: Simple database for user progress

#### 4. **No Rate Limiting** (HIGH)
**Problem**: No protection against abuse
**Risk**: Someone could spam API endpoints

**Solution**: Rate limiting middleware

#### 5. **Error Handling** (MEDIUM)
**Problem**: Some errors might expose internal details
**Solution**: Better error messages, error tracking

#### 6. **No Monitoring** (MEDIUM)
**Problem**: Cannot see:
- Who's using the app
- What problems they're solving
- Where they're getting stuck
- API costs in real-time

**Solution**: Basic analytics/logging

---

## Recommended Architecture for Pilot

### Phase 1: Immediate (Pre-Launch) - Week 1

#### A. Add Simple Authentication
```
Options:
1. **Passkey/Code System** (Simplest)
   - Generate 10 unique access codes
   - Users enter code to access app
   - Store in localStorage
   - No signup needed

2. **Email-Based Auth** (Better)
   - Simple email/password or magic link
   - Use NextAuth.js or Clerk
   - Proper user sessions

Recommendation: Passkey for pilot, Email for full launch
```

#### B. Implement Usage Limits
```
Per-User Limits (Daily):
- 5 problem scaffolds
- 10 hint generations
- 2 prerequisite checks
- 2 reflection sessions
- 2 variation sets

Total: ~$2-3 per user per day max
10 users = $20-30/day = $600-900/month budget
```

#### C. Add Rate Limiting
```
Rate Limits:
- /api/solve: 5 requests per hour per user
- /api/generate-hint: 10 requests per hour per user
- /api/prerequisites: 2 requests per hour per user
- Global: 100 requests per hour total
```

#### D. Basic Error Tracking
```
- Log all API errors
- Track API response times
- Monitor API costs
- User-friendly error messages
```

### Phase 2: Launch Support - Week 2

#### E. Usage Dashboard
```
Admin dashboard showing:
- Active users today
- API calls made
- Estimated costs
- Error rates
- Popular problems
```

#### F. Database Setup (Optional for pilot)
```
Use Vercel Postgres or Supabase for:
- User sessions
- Usage tracking
- Problem history (sync across devices)
- Analytics

For pilot: Can defer this, use localStorage + server-side usage tracking
```

---

## Implementation Priority

### Must Have (Before Pilot)
1. ✅ Passkey authentication system
2. ✅ Per-user usage limits (API quota)
3. ✅ Rate limiting on all API endpoints
4. ✅ Usage tracking and logging
5. ✅ Better error messages

### Should Have (Week 1 of Pilot)
6. ⚠️ Admin dashboard for monitoring
7. ⚠️ Cost alerts (email when >$50/day)
8. ⚠️ User feedback mechanism

### Nice to Have (Week 2+)
9. 📋 Database for persistence
10. 📋 Email auth migration path
11. 📋 Advanced analytics

---

## Cost Estimation

### Current Cost Structure (per problem solved)
```
Scaffold Generation:     $0.08 - 0.12
Prerequisites (opt):     $0.02 - 0.03
Hints (Levels 1-5):      $0.05 - 0.08
Reflection:              $0.01 - 0.02
Variations:              $0.02 - 0.03
Step-Up Challenge:       $0.03 - 0.05
-----------------------------------------
Total per problem:       $0.21 - 0.33
```

### Pilot Cost Projection (10 users, 30 days)
```
Conservative (2 problems/user/day):
10 users × 2 problems × 30 days × $0.25 = $150/month

Moderate (4 problems/user/day):
10 users × 4 problems × 30 days × $0.25 = $300/month

Heavy (8 problems/user/day):
10 users × 8 problems × 30 days × $0.25 = $600/month

Recommendation: Set hard limit at $500/month
```

### Daily Limits to Stay Under Budget
```
$500/month = ~$16.67/day
$16.67/day ÷ $0.25/problem = ~66 problems/day
66 problems ÷ 10 users = ~6-7 problems/user/day

Recommended limit: 5 problems/user/day (buffer for safety)
```

---

## Deployment Architecture

### Option 1: Vercel (Recommended for Pilot)
```
✅ Pros:
- Easy deployment
- Auto-scaling
- Edge functions
- Built-in analytics
- Free tier generous

⚠️ Cons:
- Need database for auth (can use Vercel KV)

Setup Time: 1 hour
Cost: $0-20/month (beyond API costs)
```

### Option 2: Self-Hosted (DigitalOcean/AWS)
```
✅ Pros:
- Full control
- Potentially cheaper at scale

⚠️ Cons:
- More setup time
- Need to manage server
- Need to handle scaling

Setup Time: 4-8 hours
Cost: $10-50/month
```

**Recommendation**: Use Vercel for pilot

---

## Security Considerations

### API Key Protection
```
✅ Already using environment variables
✅ Not exposed to client
⚠️ Need: Rotation strategy
⚠️ Need: Backup key for failover
```

### Rate Limiting Strategy
```
1. Per-IP rate limiting (prevent spam)
2. Per-user rate limiting (enforce quotas)
3. Global rate limiting (protect API budget)
```

### Data Privacy
```
For pilot:
- No sensitive data collected
- Problem text and answers stored locally
- Can add privacy policy page
```

---

## User Onboarding Flow

### 1. Access Code Distribution
```
Generate 10 unique codes:
PILOT-ALPHA-001 to PILOT-ALPHA-010

Email to pilot users with:
- Welcome message
- Access URL
- Access code
- Usage limits explanation
- Support contact
```

### 2. First-Time User Experience
```
1. Enter access code
2. See welcome modal explaining:
   - Daily limits (5 problems)
   - How to use the app
   - Support contact
3. Start with sample problem or Study Path
```

### 3. Limit Reached Experience
```
When daily limit reached:
- Friendly message
- Show progress today
- "Come back tomorrow" CTA
- Option to request more (for early feedback)
```

---

## Monitoring & Success Metrics

### Track These Metrics
```
Engagement:
- Daily active users
- Problems attempted per user
- Completion rate
- Average time per problem
- Hint usage patterns

Technical:
- API response times
- Error rates
- API costs (daily)
- Cache hit rates

Learning:
- Prerequisite pass rates
- Reflection quality
- Step-up challenge attempts
- Concept network usage
```

### Success Criteria for Pilot
```
✅ Good:
- 7/10 users active weekly
- 3+ problems solved per active user
- <5% error rate
- Under budget ($500/month)

✅ Excellent:
- 9/10 users active weekly
- 5+ problems solved per active user
- <2% error rate
- Positive feedback
```

---

## Next Steps - Action Plan

### Week 0 (Pre-Launch)
- [ ] Implement passkey authentication
- [ ] Add usage quota system
- [ ] Implement rate limiting
- [ ] Add usage tracking/logging
- [ ] Test with 2-3 beta users
- [ ] Deploy to Vercel
- [ ] Generate 10 access codes

### Week 1 (Pilot Launch)
- [ ] Send codes to 10 pilot users
- [ ] Monitor usage daily
- [ ] Respond to feedback quickly
- [ ] Fix critical bugs within 24h

### Week 2-4 (Iterate)
- [ ] Add requested features
- [ ] Build admin dashboard
- [ ] Analyze usage patterns
- [ ] Plan for public launch

---

## Recommended Tech Stack Additions

```javascript
// Authentication
- NextAuth.js (simple passkey provider)
- OR Vercel KV for session storage

// Rate Limiting
- upstash/ratelimit (Redis-based)
- OR simple in-memory limiter

// Usage Tracking
- Vercel Analytics
- OR simple logger to Vercel KV

// Monitoring
- Vercel Logs
- OR Sentry for error tracking

// Database (Phase 2)
- Vercel Postgres
- OR Supabase
```

---

## Estimated Setup Time

```
Core implementation:     8-12 hours
Testing:                 4-6 hours
Deployment setup:        2-3 hours
Documentation:           2-3 hours
---------------------------------
Total:                   16-24 hours (2-3 days)
```

---

## Should We Proceed?

I recommend implementing in this order:
1. **Passkey authentication** (2 hours)
2. **Usage quotas** (3 hours)
3. **Rate limiting** (2 hours)
4. **Basic monitoring** (2 hours)
5. **Deploy to Vercel** (1 hour)
6. **Test with 2 beta users** (2-4 hours)

Total: ~12-16 hours of focused work

Ready to start? I can implement each piece step by step.
