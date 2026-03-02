"""
Reusable auth + billing endpoints for FastAPI.
Copy this into your server.py or import as a router.
"""

# ─── Firebase Admin SDK init ─────────────────────────────────────
_firebase_initialized = False
def _init_firebase():
    global _firebase_initialized
    if _firebase_initialized:
        return
    sa_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY", "")
    if sa_path and os.path.isfile(sa_path):
        cred = fb_credentials.Certificate(sa_path)
        firebase_admin.initialize_app(cred)
    else:
        # Use Application Default Credentials (GCE, Cloud Run, etc.)
        firebase_admin.initialize_app()
    _firebase_initialized = True

try:
    _init_firebase()
except Exception as e:
    print(f"[WARN] Firebase Admin SDK init failed: {e}")


# ─── Auth endpoints ──────────────────────────────────────────────
from pydantic import BaseModel


class RegisterRequest(BaseModel):
    email: str
    password: str
    source: str = ""


class LoginRequest(BaseModel):
    email: str
    password: str


@app.post("/auth/register")
def register(body: RegisterRequest):
    """
    Register for a free API key with email + password.
    """
    if not body.email or "@" not in body.email:
        raise HTTPException(status_code=400, detail="Valid email required")
    if not body.password or len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    # Check if user already exists
    existing = auth.get_user_by_email(body.email)
    if existing:
        raise HTTPException(status_code=409, detail="Account already exists. Try logging in.")

    user = auth.create_user(email=body.email, source=body.source, password=body.password)
    return {
        "message": "Account created! You're logged in.",
        "api_key": user["api_key"],
        "tier": user["tier"],
        "email": user["email"],
        "docs": f"{BASE_URL}/docs",
    }


@app.post("/auth/login")
def login(body: LoginRequest):
    """
    Log in with email + password. Returns API key for session auth.
    """
    if not body.email or not body.password:
        raise HTTPException(status_code=400, detail="Email and password required")

    user = auth.authenticate(body.email, body.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    usage = auth.get_usage_count(user["api_key"])
    limit = auth.RATE_LIMITS.get(user["tier"], 100)

    return {
        "api_key": user["api_key"],
        "email": user["email"],
        "tier": user["tier"],
        "usage_24h": usage,
        "rate_limit_24h": limit,
    }


# Owner email → auto-pro
OWNER_EMAIL = "mphanko@gmail.com"


class FirebaseLoginRequest(BaseModel):
    id_token: str


@app.post("/auth/firebase-login")
def firebase_login(body: FirebaseLoginRequest):
    """
    Authenticate via Firebase ID token.
    Verifies the token, finds or creates the internal user,
    and returns API key + tier info.
    """
    if not body.id_token:
        raise HTTPException(status_code=400, detail="id_token required")

    try:
        decoded = fb_auth.verify_id_token(body.id_token)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid Firebase token: {e}")

    email = decoded.get("email", "")
    if not email:
        raise HTTPException(status_code=400, detail="Firebase token has no email")

    # Find or create internal user
    existing = auth.get_user_by_email(email)
    if existing:
        user = existing
    else:
        # Auto-create user; owner gets pro, everyone else free
        tier = "pro" if email.lower() == OWNER_EMAIL else "free"
        user = auth.create_user(email=email, source="firebase", tier=tier)

    # Auto-upgrade owner if tier is wrong
    if email.lower() == OWNER_EMAIL and user.get("tier") != "pro":
        auth.upgrade_user(email, tier="pro")
        user["tier"] = "pro"

    usage = auth.get_usage_count(user["api_key"])
    limit = auth.RATE_LIMITS.get(user["tier"], 100)

    return {
        "api_key": user["api_key"],
        "email": user["email"],
        "tier": user["tier"],
        "usage_24h": usage,
        "rate_limit_24h": limit,
    }


@app.get("/auth/me")
def get_me(key: str = Depends(require_auth)):
    """Check your API key status, tier, and usage."""
    user = auth.get_user_by_key(key)
    if not user:
        raise HTTPException(status_code=404)
    usage = auth.get_usage_count(key)
    limit = auth.RATE_LIMITS.get(user['tier'], 100)
    return {
        "email": user["email"],
        "tier": user["tier"],
        "api_key": key[:12] + "..." + key[-4:],
        "usage_24h": usage,
        "rate_limit_24h": limit,
        "source": user["source"],
        "created_at": user["created_at"],
    }


# ─── Stripe endpoints ────────────────────────────────────────────
@app.post("/billing/checkout")
def create_checkout(
    email: str = Query(...),
    tier: str = Query("pro"),
    source: str = Query(""),
):
    """
    Create a Stripe Checkout session for a Pro or Institutional subscription.
    Redirects to Stripe-hosted checkout page.
    """
    if not stripe.api_key:
        raise HTTPException(status_code=503, detail="Billing not configured yet")

    price_id = STRIPE_PRICE_PRO if tier == "pro" else STRIPE_PRICE_INSTITUTIONAL
    if not price_id:
        raise HTTPException(status_code=503, detail=f"Price for tier '{tier}' not configured")

    # Ensure user exists
    user = auth.create_user(email=email, source=source)

    try:
        session = stripe.checkout.Session.create(
            mode="subscription",
            payment_method_types=["card"],
            customer_email=email,
            line_items=[{"price": price_id, "quantity": 1}],
            success_url=f"{BASE_URL}/billing/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{BASE_URL}/billing/cancel",
            allow_promotion_codes=True,
            metadata={"email": email, "tier": tier},
        )
        return {"checkout_url": session.url}
    except stripe.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/billing/success")
def billing_success(session_id: str = Query(...)):
    """Landing page after successful Stripe checkout."""
    if not stripe.api_key:
        return {"message": "Payment recorded. Your tier will be upgraded shortly."}

    try:
        session = stripe.checkout.Session.retrieve(session_id)
        email = session.metadata.get("email", session.customer_email)
        tier = session.metadata.get("tier", "pro")

        # Upgrade user
        auth.upgrade_user(email, tier)
        auth.update_user_stripe(
            email,
            stripe_customer_id=session.customer or "",
            stripe_subscription_id=session.subscription or "",
        )

        user = auth.get_user_by_email(email)
        return {
            "message": f"Welcome to TickerTrace {tier.title()}!",
            "tier": tier,
            "api_key": user["api_key"] if user else "check your email",
        }
    except stripe.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/billing/cancel")
def billing_cancel():
    return {"message": "Checkout cancelled. No charges made."}


@app.post("/billing/webhook")
async def stripe_webhook(request: Request):
    """
    Stripe webhook handler for subscription lifecycle events.
    Set this URL in Stripe Dashboard → Webhooks.
    """
    if not STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=503, detail="Webhook not configured")

    body = await request.body()
    sig = request.headers.get("stripe-signature", "")

    try:
        event = stripe.Webhook.construct_event(body, sig, STRIPE_WEBHOOK_SECRET)
    except (stripe.SignatureVerificationError, ValueError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid webhook: {e}")

    event_type = event["type"]
    obj = event["data"]["object"]

    if event_type == "checkout.session.completed":
        email = obj.get("metadata", {}).get("email") or obj.get("customer_email")
        tier = obj.get("metadata", {}).get("tier", "pro")
        if email:
            auth.upgrade_user(email, tier)
            auth.update_user_stripe(
                email,
                stripe_customer_id=obj.get("customer", ""),
                stripe_subscription_id=obj.get("subscription", ""),
            )

    elif event_type in ("customer.subscription.deleted", "customer.subscription.paused"):
        customer_id = obj.get("customer")
        if customer_id:
            user = auth.get_user_by_stripe_id(customer_id)
            if user:
                auth.downgrade_user(user["email"])

    elif event_type == "customer.subscription.updated":
        customer_id = obj.get("customer")
        status = obj.get("status")
        if customer_id and status == "active":
            user = auth.get_user_by_stripe_id(customer_id)
            if user and user["tier"] == "free":
                auth.upgrade_user(user["email"], "pro")
        elif customer_id and status in ("canceled", "unpaid", "past_due"):
            user = auth.get_user_by_stripe_id(customer_id)
            if user:
                auth.downgrade_user(user["email"])

    return {"received": True}


# ─── Promo code endpoints ─────────────────────────────────────────
@app.post("/auth/redeem")
def redeem_promo_code(
    email: str = Query(...),
    code: str = Query(...),
):
    """
    Redeem a promo code to upgrade tier.
    User must have an account (register first).
    """
    user = auth.get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=404, detail="Register first at /auth/register")

    ok, msg = auth.redeem_promo(email, code)
    if not ok:
        raise HTTPException(status_code=400, detail=msg)

    updated = auth.get_user_by_email(email)
    return {
        "message": msg,
        "tier": updated["tier"] if updated else "unknown",
        "api_key": updated["api_key"] if updated else "",
    }


@app.post("/billing/cancel")
def cancel_subscription(key: str = Depends(require_auth)):
    """
    Cancel subscription at end of current period (not immediate).
    Ported from TraderDaddy's cancel-at-period-end pattern.
    """
    if not stripe.api_key:
        raise HTTPException(status_code=503, detail="Billing not configured")

    user = auth.get_user_by_key(key)
    if not user or not user.get("stripe_subscription_id"):
        raise HTTPException(status_code=404, detail="No active subscription found")

    try:
        stripe.Subscription.modify(
            user["stripe_subscription_id"],
            cancel_at_period_end=True,
        )
        return {"message": "Subscription will cancel at end of billing period. You keep access until then."}
    except stripe.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/admin/promo")
def create_promo_code(
    code: str = Query(...),
    tier: str = Query("pro"),
    duration_days: int = Query(30),
    max_uses: int = Query(1),
    admin_key: str = Query(...),
):
    """
    Create a promo code (admin only).
    Requires ADMIN_KEY env var to be set.
    """
    expected = os.getenv("ADMIN_KEY", "")
    if not expected or admin_key != expected:
        raise HTTPException(status_code=403, detail="Invalid admin key")

    result = auth.create_promo(code, tier, duration_days, max_uses)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8100)
