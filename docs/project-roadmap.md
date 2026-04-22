# Project Roadmap & Development Phases

## Project Status Overview

| Phase | Status | Progress | Target Date |
|-------|--------|----------|-------------|
| Phase 1: Backend API | Complete | 100% | ✓ Done |
| Phase 2: Frontend UI | In Progress | 10% | Week 8 |
| Phase 3: Testing & QA | Not Started | 0% | Week 12 |
| Phase 4: Performance & Security | Not Started | 0% | Week 14 |
| Phase 5: Deployment & Monitoring | Not Started | 0% | Week 16 |

## Phase 1: Backend API - COMPLETE

**Status:** ✓ Complete  
**Duration:** Weeks 1–4  
**Owner:** Backend Team

### Deliverables
- [x] NestJS project setup with all 14 modules
- [x] Database schema (18 models, Prisma)
- [x] Authentication (JWT, refresh tokens, bcrypt)
- [x] RBAC (Buyer, Seller, Admin roles)
- [x] Product management (CRUD, versioning, images)
- [x] Shopping cart & order placement
- [x] Payment gateway integration (MOMO, VNPay, Wallet)
- [x] Seller wallet & payout system
- [x] Reviews & ratings
- [x] License management & download tracking
- [x] Notifications system
- [x] Redis caching (products, tokens)
- [x] AWS S3 presigned URL integration
- [x] Error handling & response formatting
- [x] Rate limiting (ThrottlerModule)
- [x] Swagger API documentation
- [x] Global guards, decorators, filters
- [x] Transaction safety (Prisma transactions)

### Key Achievements
- All 40+ endpoints implemented & documented
- Database relationships properly modeled
- Authentication flow secured with HttpOnly cookies
- Payment integrations ready for testing
- File upload/download via presigned URLs working
- API response format standardized
- Rate limiting configured (100 req/60s)

### Testing Status
- [ ] Unit tests for all services
- [ ] E2E tests for critical flows
- [ ] Payment flow testing
- [ ] Auth refresh token testing

### Known Issues
- None documented

### Transition Notes
- All endpoints ready for frontend integration
- Environment variables documented in `.env.example`
- Swagger docs available at `http://localhost:3000/api/docs`
- Prisma migrations must be run before first use

---

## Phase 2: Frontend UI - IN PROGRESS

**Status:** In Progress  
**Duration:** Weeks 5–10  
**Owner:** Frontend Team  
**Progress:** 10% (Architecture setup complete)

### Current Work
- [x] Next.js 16 project scaffold
- [x] Environment configuration (Zod validation)
- [x] Axios HTTP client setup
- [x] Route Handler skeleton (BFF proxy pattern)
- [ ] Homepage component
- [ ] Product list & grid
- [ ] Product detail page
- [ ] Search & filtering UI
- [ ] Shopping cart page
- [ ] Checkout flow
- [ ] Order confirmation
- [ ] User profile page
- [ ] Seller dashboard
- [ ] Admin dashboard

### Subphase 2A: Public Pages (Weeks 5–6)

**Deliverables:**
- Homepage with featured products
- Product listing page (paginated, filterable)
- Product detail page (images, versions, reviews)
- Search bar & advanced filters
- Category browsing (hierarchical tree)
- User registration & login pages
- Password reset flow

**Success Criteria:**
- [ ] All pages load within 2 seconds
- [ ] Mobile responsive (320px–2560px)
- [ ] Search returns results in <500ms
- [ ] Category tree displays correctly
- [ ] Login/register forms validate input

**Components to Build:**
- ProductCard
- ProductGrid
- SearchBar
- CategoryTree
- LoginForm
- RegisterForm
- ReviewsList
- RatingStar

### Subphase 2B: Shopping & Checkout (Weeks 7–8)

**Deliverables:**
- Shopping cart (add/remove items, update quantity)
- Cart persistence (localStorage + DB sync)
- Checkout page (product review, address, payment method selection)
- Payment selection UI (MOMO, VNPay, Wallet)
- Order summary & confirmation
- Order history page
- Download center (purchased products)

**Success Criteria:**
- [ ] Cart operations complete in <200ms
- [ ] Checkout form validates all fields
- [ ] Payment redirect works for all methods
- [ ] Download links generate presigned URLs
- [ ] Order history loads paginated

**Components to Build:**
- CartItem
- CartSummary
- CheckoutForm
- PaymentMethodSelector
- OrderCard
- DownloadCenter
- LicenseCard

### Subphase 2C: User & Seller Features (Weeks 9–10)

**Deliverables:**
- User profile page (edit info, avatar, social links)
- Seller dashboard (product management, analytics)
- Product upload form (title, description, price, versioning)
- Version management (upload new versions, changelogs)
- Sales analytics (total sales, revenue, best-sellers)
- Wallet page (balance, transaction history)
- Payout requests (bank details, withdraw)
- Admin dashboard (product approval, user management)

**Success Criteria:**
- [ ] Profile updates persist to database
- [ ] Product upload handles file selection
- [ ] Version history displays correctly
- [ ] Analytics charts render properly
- [ ] Payout requests validate bank info
- [ ] Admin approval/rejection works

**Components to Build:**
- ProfileForm
- ProductUploadForm
- VersionHistory
- AnalyticsChart
- WalletSummary
- PayoutForm
- AdminProductQueue
- AdminUserManagement

### API Route Handlers to Implement
- `app/api/auth/register`
- `app/api/auth/login`
- `app/api/auth/refresh`
- `app/api/products`
- `app/api/products/[slug]`
- `app/api/cart`
- `app/api/orders`
- `app/api/payments/callback`
- `app/api/users/profile`
- `app/api/wallet`
- `app/api/admin/products`

### TanStack Query Hooks to Implement
- `useProducts()`
- `useProductDetail(slug)`
- `useCart()`
- `useOrders()`
- `useCreateOrder()`
- `usePayments()`
- `useUserProfile()`
- `useWallet()`
- `useUploadProduct()`
- `useReviews(productId)`

### Known Issues
- None yet (just starting)

### Dependencies
- Backend API must be stable & running
- Swagger docs must be available for reference
- Environment variables must be configured

### Risks
- Tight timeline for full feature set
- Payment gateway testing requires live credentials
- File upload size limits need definition
- Image optimization for product galleries

### Mitigation
- Start with public pages, then authenticated
- Use mock data for payment testing initially
- Implement progressive image loading
- Parallel work on different features

---

## Phase 3: Testing & QA

**Status:** Not Started  
**Duration:** Weeks 11–12  
**Owner:** QA Team

### Backend Testing

**Unit Tests:**
- [ ] AuthService (login, refresh, validation)
- [ ] ProductsService (CRUD, filtering, caching)
- [ ] OrdersService (transaction, status tracking)
- [ ] PaymentsService (gateway callbacks)
- [ ] WalletService (balance, transactions)
- [ ] ReviewsService (rating validation)
- [ ] LicensesService (expiration, download counting)
- Target: 80%+ coverage

**E2E Tests:**
- [ ] User registration → login → product purchase → download
- [ ] Seller flow: create product → submit review → publish → track sales
- [ ] Payment flow: MOMO redirect → callback → order confirmation
- [ ] Cart: add items → checkout → order created
- [ ] Admin flow: pending products → approve/reject → publish
- Target: All critical user journeys

**Performance Tests:**
- [ ] Homepage load: <2s
- [ ] Product search: <500ms
- [ ] Cart operations: <200ms
- [ ] Checkout: <1s
- [ ] Payment callback: <500ms

### Frontend Testing

**Component Tests:**
- [ ] ProductCard renders correctly
- [ ] SearchBar filters work
- [ ] CartItem add/remove works
- [ ] CheckoutForm validates input
- [ ] ProfileForm updates user

**Integration Tests:**
- [ ] Login → redirect to homepage
- [ ] Add to cart → checkout flow works
- [ ] Payment redirect → confirmation
- [ ] Product upload → admin review queue

**E2E Tests (Cypress/Playwright):**
- [ ] Complete user registration & purchase flow
- [ ] Seller product creation & publication
- [ ] Cart & checkout
- [ ] Wallet & payout

### QA Scenarios

**Functional:**
- [ ] All CRUD operations work end-to-end
- [ ] Validation prevents invalid data
- [ ] Error messages are clear
- [ ] Success notifications appear
- [ ] Permissions enforced correctly

**Security:**
- [ ] XSS prevention (script injection fails)
- [ ] CSRF protection (token validation)
- [ ] SQL injection prevention (parameterized queries)
- [ ] Authentication tokens secure
- [ ] Sensitive data not logged

**Performance:**
- [ ] API response times acceptable
- [ ] Database queries optimized
- [ ] No memory leaks
- [ ] Cache invalidation works
- [ ] Rate limiting prevents abuse

**Compatibility:**
- [ ] Works on Chrome, Firefox, Safari, Edge
- [ ] Mobile responsive (iOS, Android)
- [ ] Works on 2G/3G/4G connections
- [ ] Graceful degradation for old browsers

### Success Criteria
- [ ] 90%+ test coverage (backend services)
- [ ] All critical path E2E tests pass
- [ ] No critical bugs found
- [ ] Performance benchmarks met
- [ ] Security audit passed

---

## Phase 4: Performance & Security

**Status:** Not Started  
**Duration:** Weeks 13–14  
**Owner:** DevOps & Security Team

### Performance Optimization

**Backend:**
- [ ] Database query profiling & indexing
- [ ] Lazy load relationships
- [ ] Cache hot data (products, categories)
- [ ] Connection pooling tuning
- [ ] Response time <200ms for 99% of requests
- [ ] Horizontal scaling ready

**Frontend:**
- [ ] Code splitting & lazy loading
- [ ] Image optimization & responsive sizes
- [ ] CSS minification & purging
- [ ] JavaScript bundle size <100KB gzipped
- [ ] Lighthouse score >90
- [ ] Core Web Vitals passing

**Network:**
- [ ] Enable gzip/brotli compression
- [ ] Configure CDN for static assets
- [ ] Implement caching headers
- [ ] HTTP/2 or HTTP/3
- [ ] First contentful paint <2s

### Security Hardening

**Authentication:**
- [ ] JWT secret rotation
- [ ] Token blacklist for logout
- [ ] Refresh token revocation
- [ ] Session fixation prevention
- [ ] Password requirements enforced

**Authorization:**
- [ ] RBAC audit & refinement
- [ ] Principle of least privilege
- [ ] API endpoint permissions verified
- [ ] Admin-only endpoints restricted

**Data Protection:**
- [ ] HTTPS enforced everywhere
- [ ] HSTS headers configured
- [ ] Secrets stored in Vault/AWS Secrets Manager
- [ ] Sensitive logs redacted
- [ ] Data encryption at rest & in transit

**Input Validation:**
- [ ] All inputs validated & sanitized
- [ ] File upload size/type restrictions
- [ ] Rate limiting per user
- [ ] DDoS protection enabled
- [ ] Suspicious activity logged

**Dependencies:**
- [ ] Dependency scanning (npm audit, Snyk)
- [ ] Known vulnerability patching
- [ ] Outdated dependency removal
- [ ] License compliance check

### Success Criteria
- [ ] Lighthouse score >90 on desktop & mobile
- [ ] API response time <200ms (p99)
- [ ] Security audit passes (OWASP Top 10)
- [ ] No high/critical vulnerabilities
- [ ] Load test: 1000 concurrent users
- [ ] Zero unhandled errors in production

---

## Phase 5: Deployment & Monitoring

**Status:** Not Started  
**Duration:** Weeks 15–16  
**Owner:** DevOps Team

### Infrastructure

**Staging Environment:**
- [ ] EC2/ECS for backend
- [ ] RDS MySQL database
- [ ] ElastiCache Redis cluster
- [ ] CloudFront CDN
- [ ] Route53 DNS
- [ ] WAF for protection

**Production Environment:**
- [ ] Load balancer (ALB)
- [ ] Auto-scaling groups (backend)
- [ ] RDS Multi-AZ (database)
- [ ] ElastiCache cluster mode (Redis)
- [ ] CloudFront (static assets)
- [ ] S3 versioning & lifecycle policies

### CI/CD Pipeline

**GitHub Actions:**
- [ ] Lint & format check
- [ ] Unit tests run
- [ ] Build succeeds
- [ ] E2E tests pass
- [ ] Security scan passes
- [ ] Deploy to staging
- [ ] Smoke tests run
- [ ] (Manual approval)
- [ ] Deploy to production

### Monitoring & Observability

**Application Monitoring:**
- [ ] Error tracking (Sentry/Datadog)
- [ ] Performance monitoring (APM)
- [ ] User analytics (Mixpanel/Amplitude)
- [ ] Custom dashboards & alerts

**Infrastructure Monitoring:**
- [ ] CPU, memory, disk usage
- [ ] Network I/O
- [ ] Database connections
- [ ] Cache hit rate
- [ ] Queue depth (if used)

**Logging:**
- [ ] Structured logging (JSON)
- [ ] Log aggregation (CloudWatch/ELK)
- [ ] Log retention policy
- [ ] Real-time alerts

**Alerting:**
- [ ] Error rate threshold (>1%)
- [ ] Response time threshold (>500ms)
- [ ] Database connection exhaustion
- [ ] Cache miss rate spike
- [ ] Disk space critical

### Backup & Disaster Recovery

**Database:**
- [ ] Automated daily backups
- [ ] Point-in-time restore capability
- [ ] Cross-region replication (optional)
- [ ] Backup tested monthly

**Configuration:**
- [ ] Infrastructure as Code (Terraform/CloudFormation)
- [ ] Secrets management (AWS Secrets Manager)
- [ ] Configuration versioning (GitHub)
- [ ] Disaster recovery plan documented

### Rollback Strategy

- [ ] Feature flags for gradual rollout
- [ ] Blue-green deployments
- [ ] Automated rollback on error rate spike
- [ ] Manual rollback procedure documented

### Success Criteria
- [ ] 99.9% uptime SLA
- [ ] Auto-scaling functional
- [ ] Incident response <15 minutes
- [ ] Recovery time objective (RTO) <1 hour
- [ ] Recovery point objective (RPO) <15 minutes

---

## Post-Launch: Ongoing Maintenance

### Weekly Tasks
- [ ] Review error logs & fix critical bugs
- [ ] Monitor performance metrics
- [ ] Update dependencies
- [ ] Review user feedback

### Monthly Tasks
- [ ] Security patch updates
- [ ] Performance optimization analysis
- [ ] User analytics review
- [ ] Feature prioritization

### Quarterly Tasks
- [ ] Major feature planning
- [ ] Infrastructure scaling review
- [ ] Security audit
- [ ] Disaster recovery drill

---

## Timeline Summary

| Phase | Weeks | Start | End | Status |
|-------|-------|-------|-----|--------|
| Phase 1: Backend API | 4 | Week 1 | Week 4 | ✓ Complete |
| Phase 2: Frontend UI | 6 | Week 5 | Week 10 | In Progress |
| Phase 3: Testing & QA | 2 | Week 11 | Week 12 | Queued |
| Phase 4: Perf & Security | 2 | Week 13 | Week 14 | Queued |
| Phase 5: Deploy & Monitor | 2 | Week 15 | Week 16 | Queued |
| **Total** | **16** | | | |

---

## Key Milestones

1. **Week 4:** Backend API feature-complete
2. **Week 6:** Public pages (homepage, product list) live
3. **Week 8:** Checkout flow complete
4. **Week 10:** Frontend MVP complete
5. **Week 12:** All tests passing
6. **Week 14:** Security audit passed
7. **Week 16:** Production deployment ready

---

## Dependencies & Blockers

### Current Blockers
- None identified

### Upcoming Risks
- Tight timeline for frontend (6 weeks for full feature set)
- Payment gateway testing requires live credentials
- Database migration strategy needs planning
- Seller onboarding verification process undefined

### Mitigation Strategies
- Start with MVP: homepage, product list, basic checkout
- Defer advanced features (analytics, recommendations, promotions)
- Use staging environment for payment testing
- Database migration script & rollback plan
- Seller verification via manual admin review initially

---

## Success Metrics

### Business KPIs
- [ ] User registration: 100+ users
- [ ] Product listings: 50+ products
- [ ] Monthly transactions: 200+
- [ ] Average order value: $50+
- [ ] Seller retention: 80%+

### Technical KPIs
- [ ] API uptime: 99.9%
- [ ] Page load time: <2s
- [ ] Error rate: <1%
- [ ] Test coverage: >80%
- [ ] Security vulnerabilities: 0 critical

### User Experience KPIs
- [ ] Mobile conversion rate: >2%
- [ ] Cart abandonment: <70%
- [ ] User satisfaction: >4.5/5
- [ ] Support ticket resolution: <24h
- [ ] Feature adoption: >50% monthly

---

## Notes & Decisions

- **Tech Stack Locked:** NestJS, Next.js, React, TailwindCSS, Prisma
- **Payment Gateways:** MOMO, VNPay, Wallet (no credit card initially)
- **Seller Verification:** Manual admin review initially (auto-verification later)
- **Content Moderation:** Admin review before publication (marketplace quality)
- **Refund Policy:** 30-day refund for bugs, seller decision on extras
- **Commission:** TBD by business team (initially 0% for early sellers)

