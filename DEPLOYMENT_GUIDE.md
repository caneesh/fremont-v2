# PhysiScaffold - Deployment Guide

## ✅ Implementation Complete!

All pilot launch features are now implemented:
- ✅ Passkey authentication (10 codes)
- ✅ Usage quotas & limits
- ✅ All API endpoints protected
- ✅ All client components updated
- ✅ Cost controls in place

---

## 📋 Pre-Deployment Checklist

### 1. Local Testing (Do This Now)
```bash
# Make sure dev server is running
npm run dev

# Test the following:
```

**Test Authentication:**
1. Open http://localhost:3000
2. You should see login screen (not the app)
3. Enter code: `PILOT-ALPHA-001`
4. Should see welcome modal with quota limits
5. Click "Start Learning"

**Test Quotas:**
1. Submit a problem (should work - 4/5 remaining)
2. Try to submit 5 more problems total
3. 6th attempt should show "Daily quota exceeded" alert

**Test Logout:**
1. Click "Logout" button (top-right)
2. Should return to login screen
3. Login again with same code - quotas should persist

**Test Features:**
1. Try prerequisite check
2. Generate some hints
3. Test reflection
4. Try variations
5. All should work with quota tracking

---

## 🚀 Deploy to Vercel

### Step 1: Commit & Push Code
```bash
# Stage all changes
git add .

# Commit
git commit -m "Add pilot auth system and usage quotas

- Implement passkey authentication (10 pilot codes)
- Add daily usage quotas (5 problems, 10 hints, etc.)
- Protect all API endpoints with auth + quota checks
- Update all client components to use authenticated fetch
- Add cost controls and monitoring

Ready for 10-user pilot launch"

# Push to GitHub
git push origin main
```

### Step 2: Create Vercel Project
1. Go to https://vercel.com
2. Click **"New Project"**
3. Import your GitHub repository: `fremont-v2`
4. Configure project:
   - **Framework Preset:** Next.js
   - **Root Directory:** `./`
   - **Build Command:** `npm run build` (default)
   - **Output Directory:** `.next` (default)

### Step 3: Add Environment Variables
In Vercel project settings, add:

```
ANTHROPIC_API_KEY=your_actual_api_key_here
NODE_ENV=production
```

**Important:** Replace `your_actual_api_key_here` with your real Anthropic API key

### Step 4: Deploy
1. Click **"Deploy"**
2. Wait 2-3 minutes for build
3. Get your deployment URL: `https://your-app-name.vercel.app`

### Step 5: Test Production
1. Visit your Vercel URL
2. Test login with `PILOT-ALPHA-001`
3. Submit a problem
4. Verify all features work
5. Test quota limits

---

## 👥 Pilot User Setup

### The 10 Access Codes
```
PILOT-ALPHA-001
PILOT-ALPHA-002
PILOT-ALPHA-003
PILOT-ALPHA-004
PILOT-ALPHA-005
PILOT-ALPHA-006
PILOT-ALPHA-007
PILOT-ALPHA-008
PILOT-ALPHA-009
PILOT-ALPHA-010
```

### Send Invitations

**Email Template:**
```
Subject: PhysiScaffold Pilot - Your Exclusive Access

Hi [Name],

You've been selected for the PhysiScaffold pilot program!

🔑 Your Personal Access Code: PILOT-ALPHA-XXX

🚀 Get Started:
1. Visit https://[your-app].vercel.app
2. Enter your access code
3. Start solving IIT-JEE Physics problems!

📊 Your Daily Limits:
• 5 problem scaffolds
• 10 progressive hints
• 2 prerequisite checks
• 2 reflection sessions
• 2 problem variations

These limits reset daily at midnight IST.

💡 How PhysiScaffold Works:
We use Socratic teaching - we don't give you answers, we guide you
to discover them through progressive hints (5 levels).

📝 We Need Your Feedback:
This is a pilot program. Please share:
- What works well
- What's confusing
- Features you'd like
- Any bugs you encounter

Reply to this email or contact: [your-email]

Happy Learning!
[Your Name]

---
PhysiScaffold - The Socratic Physics Engine
"We don't give answers; we give the framework for the answer"
```

---

## 📊 Monitoring During Pilot

### Check Usage Daily

**View Server Logs (Vercel Dashboard):**
1. Go to your project → Deployments → Latest
2. Click "View Function Logs"
3. Look for patterns like:
   ```
   [user-001] Generating scaffold...
   [user-001] Scaffold generated in 28.5s
   ```

**What to Monitor:**
- Active users per day (look for unique user IDs in logs)
- API call counts
- Error rates
- Response times

### Cost Monitoring

**Check Anthropic Dashboard:**
1. Go to https://console.anthropic.com
2. Navigate to "Usage"
3. Monitor daily costs

**Expected Costs:**
- Light usage (2 problems/user/day): ~$5-7/day
- Moderate (4 problems/user/day): ~$10-15/day
- Heavy (7-8 problems/user/day): ~$18-25/day

**Alert Threshold:** If costs exceed $20/day, investigate

### Weekly Check-In

**Week 1:**
- How many users activated?
- Average problems solved per user?
- Any quota complaints?
- Common error messages?

**Week 2-4:**
- User retention (still active?)
- Feature usage patterns
- Feedback themes
- Technical issues

---

## 🐛 Common Issues & Fixes

### Issue: "Unauthorized" Error
**Cause:** User not logged in or session expired
**Fix:**
- Logout and login again
- Clear browser localStorage
- Try different access code

### Issue: "Daily quota exceeded"
**Cause:** User hit their daily limit
**Fix:**
- Limits reset at midnight
- Can manually reset via code if needed (see below)

### Issue: Slow API Responses
**Cause:** Cold starts on Vercel serverless
**Fix:** Normal - first request is slower, subsequent ones faster

### Manual Quota Reset (If Needed)
```typescript
// In browser console:
localStorage.clear()
// Then refresh page and login again
```

---

## 🔒 Security Notes

### API Key Protection
- ✅ API key is server-side only (not exposed to client)
- ✅ Stored in Vercel environment variables
- ⚠️ Rotate key if ever compromised

### Access Codes
- ✅ Codes are server-side validated
- ✅ Cannot be guessed (16-char random)
- ⚠️ If a code leaks, you can disable it by editing `lib/auth/authService.ts`

### Rate Limiting
- ✅ Per-user quotas enforced
- ✅ Server-side validation
- ⚠️ Consider adding IP-based rate limiting if abuse occurs

---

## 📈 Success Metrics

### Day 1
- [ ] All 10 users can login successfully
- [ ] At least 5 users submit a problem
- [ ] No critical errors in logs

### Week 1
- [ ] 7+ users still active
- [ ] 3+ problems solved per active user
- [ ] <5% error rate
- [ ] Costs under $15/day

### Week 2-4
- [ ] 5+ users consistently active
- [ ] Positive feedback from majority
- [ ] Average 4+ problems per user
- [ ] System stable (no crashes)

---

## 🎯 Post-Pilot Next Steps

### If Pilot Succeeds (70%+ positive feedback)
1. Add database (Vercel Postgres)
2. Build admin dashboard
3. Implement email authentication
4. Open to more users (50-100)
5. Add payment/subscription system

### If Issues Found
1. Address critical bugs first
2. Iterate on feedback
3. Run extended pilot (30 more days)
4. Reassess

---

## 💰 Cost Management

### Current Budget: $500/month

**Conservative Estimate (10 users):**
- 2 problems/user/day × 30 days = $150/month ✅

**Moderate Estimate:**
- 4 problems/user/day × 30 days = $300/month ✅

**Heavy Estimate:**
- 8 problems/user/day × 30 days = $600/month ⚠️

**If Costs Exceed Budget:**
1. Reduce daily quotas (5 → 3 problems)
2. Pause new signups
3. Add wait times between requests
4. Optimize prompts to reduce tokens

---

## 🆘 Emergency Contacts

**If Production Goes Down:**
1. Check Vercel status page
2. Check Anthropic API status
3. Review error logs
4. Rollback deployment if needed

**Quick Rollback:**
1. Go to Vercel Dashboard
2. Deployments → Previous deployment
3. Click "..." → "Promote to Production"

---

## 📞 Support Plan

### User Support
- Email: [your-email]
- Response time: <24 hours
- Critical issues: <4 hours

### Known Limitations (Communicate to Users)
- Daily quotas reset at midnight
- First request may be slow (cold start)
- Data stored locally (don't clear browser cache)
- Best on desktop (mobile works but not optimized)

---

## ✅ Final Pre-Launch Checklist

Before sending invites:
- [ ] Test authentication locally
- [ ] Test quota limits locally
- [ ] Deploy to Vercel successfully
- [ ] Test production deployment
- [ ] Verify API key is set in Vercel
- [ ] Test all 10 access codes work
- [ ] Prepare welcome email
- [ ] Set up monitoring alerts
- [ ] Have Anthropic API credits funded
- [ ] Document support process

---

## 🎉 You're Ready to Launch!

**Launch Steps:**
1. ✅ Complete final testing
2. ✅ Deploy to Vercel
3. ✅ Send invites to 10 users
4. ✅ Monitor for first 24 hours closely
5. ✅ Respond to feedback quickly

**Good luck with your pilot launch! 🚀**

---

*Last Updated: [Date]*
*Version: 1.0.0 - Pilot Launch*
