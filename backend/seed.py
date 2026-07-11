"""Seed Facets Jewellery CRM with realistic Indian demo data.

Usage:
    python seed.py            # idempotent reset + seed
    python seed.py --keep     # only seed if DB empty
"""
import os
import random
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

from faker import Faker

from database import engine, SessionLocal, Base
from models import (
    User, Lead, Activity, Call, Task, WhatsappMessage, Notification,
    Product, Appointment, Quotation, AIAgentLog,
)
from auth_utils import hash_password

fake = Faker("en_IN")
random.seed(42)
Faker.seed(42)

INDIAN_CITIES = [
    "Mumbai", "Bengaluru", "Delhi", "Hyderabad", "Chennai", "Kolkata",
    "Pune", "Ahmedabad", "Jaipur", "Surat", "Lucknow", "Indore", "Coimbatore",
    "Chandigarh", "Visakhapatnam", "Kochi",
]

AGENCY_BRANDS = [
    "ParshWebCraft", "Wipro Digital", "Infosys Interactive", "Cognizant Studio", "TCS Digital Experience"
]

LEAD_SOURCES = ["Website", "WhatsApp", "LinkedIn", "Facebook", "Walk-In", "Referral", "Google Ads"]
LEAD_STATUSES = ["New", "Contacted", "Follow Up", "Interested", "Meeting Scheduled",
                 "Proposal Sent", "Negotiation", "Won", "Lost"]
CUSTOMER_TYPES = ["Startup Website", "E-commerce Business", "Mobile App Client", "Local SEO Audit", "SaaS Software Partner"]

PRODUCT_CATEGORIES = ["Website Design", "Custom E-commerce", "Mobile App Development", "SEO & Marketing", "Custom CRM/SaaS", "WordPress Blog", "Landing Page", "Cloud Hosting"]
METAL_TYPES = ["React/Node", "WordPress", "Flutter/React Native", "Python/Django", "Shopify/PHP"]
PURITY_BY_METAL = {
    "React/Node": ["Tier 1 (Enterprise)", "Tier 2 (Mid-size)", "Tier 3 (Basic)"],
    "WordPress": ["Premium Theme", "Custom Theme", "Basic Site"],
    "Flutter/React Native": ["iOS & Android", "iOS Only", "Android Only"],
    "Python/Django": ["Enterprise Integration", "API Backend Only", "MVP Portal"],
    "Shopify/PHP": ["Custom Theme", "Standard Template", "Migration Services"],
}

SENTIMENTS = ["Positive", "Neutral", "Negative"]
NEXT_ACTIONS = [
    "Schedule Zoom discovery call",
    "Send detailed proposal estimate",
    "Share agency portfolio and case studies",
    "Follow up in 2 days",
    "Schedule technical consultation",
    "Send contract agreement details",
    "Offer complimentary speed audit",
]

WHATSAPP_TEMPLATES = [
    ("in", "Hi, I'm interested in your website design services. Could you share your portfolio?"),
    ("out", "Hello! Thanks for reaching out to {brand}. I've shared our latest agency portfolio via email. Would you like to schedule a discovery call this week?"),
    ("in", "What is your hourly or package rate for e-commerce website development?"),
    ("out", "Our custom Shopify stores start from ₹{rate} inclusive of support. We can schedule a call to give you a customized estimate."),
    ("in", "Can you send pricing options for custom React app development?"),
    ("out", "Sure! Sharing our pricing packages now. All come with 3 months free maintenance. Budget range starts at ₹{budget}."),
    ("in", "Booking a discovery call on Saturday 5pm to discuss our portal project."),
    ("out", "Wonderful! Call scheduled for Saturday 5pm. Our lead architect will join the meeting."),
    ("in", "Need a proposal and estimate for the website features we discussed last week."),
    ("out", "Drafting proposal #{qt} with the hosting discount we discussed. You'll receive it within an hour."),
]


def reset_database() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def seed_users(db):
    admin = User(
        name="ParshWebCraft Admin",
        email=os.environ.get("ADMIN_EMAIL", "admin@parshwebcraft.com").lower(),
        password_hash=hash_password(os.environ.get("ADMIN_PASSWORD", "password123")),
        role="Admin", is_active=True,
    )
    db.add(admin)

    managers = [
        ("Priya Sharma", "priya.sharma@parshwebcraft.com"),
        ("Rohan Mehta", "rohan.mehta@parshwebcraft.com"),
    ]
    sales = [
        ("Aditi Kapoor", "aditi.kapoor@parshwebcraft.com"),
        ("Vikram Iyer", "vikram.iyer@parshwebcraft.com"),
        ("Neha Reddy", "neha.reddy@parshwebcraft.com"),
    ]

    user_objs = [admin]
    for name, email in managers:
        u = User(name=name, email=email, password_hash=hash_password("password123"),
                 role="Manager", is_active=True)
        db.add(u)
        user_objs.append(u)
    for name, email in sales:
        u = User(name=name, email=email, password_hash=hash_password("password123"),
                 role="Sales", is_active=True)
        db.add(u)
        user_objs.append(u)
    db.commit()
    for u in user_objs:
        db.refresh(u)
    return user_objs


def seed_products(db, n=40):
    products = []
    for _ in range(n):
        metal = random.choice(METAL_TYPES)
        cat = random.choice(PRODUCT_CATEGORIES)
        weight = round(random.uniform(10.0, 100.0), 2)
        making = round(random.uniform(5000, 40000), 0)
        if metal == "React/Node":
            price = round(random.uniform(1_50_000, 5_00_000), 0)
        elif metal == "WordPress":
            price = round(random.uniform(25_000, 80_000), 0)
        elif metal == "Flutter/React Native":
            price = round(random.uniform(2_00_000, 8_00_000), 0)
        elif metal == "Python/Django":
            price = round(random.uniform(2_50_000, 10_00_000), 0)
        else:
            price = round(random.uniform(40_000, 1_50_000), 0)
        p = Product(
            product_name=f"{random.choice(['Premium','Custom','Enterprise','Sleek','Modern','Dynamic','Agile','Tailored'])} {cat}",
            category=cat,
            metal_type=metal,
            purity=random.choice(PURITY_BY_METAL[metal]),
            weight=weight,
            making_charges=making,
            price=price,
        )
        db.add(p)
        products.append(p)
    db.commit()
    return products


def seed_leads(db, sales_users, n=100):
    leads = []
    now = datetime.now(timezone.utc)
    for _ in range(n):
        status = random.choices(
            LEAD_STATUSES,
            weights=[18, 14, 14, 12, 10, 8, 8, 8, 8],
        )[0]
        cust_type = random.choice(CUSTOMER_TYPES)
        budget_band = {
            "Startup Website": (20_000, 80_000),
            "E-commerce Business": (50_000, 5_00_000),
            "Mobile App Client": (1_50_000, 8_00_000),
            "Local SEO Audit": (10_000, 50_000),
            "SaaS Software Partner": (2_00_000, 15_00_000),
        }[cust_type]
        lead = Lead(
            name=fake.name(),
            phone=f"+91{random.randint(7000000000, 9999999999)}",
            email=fake.email(),
            company=random.choice(AGENCY_BRANDS) if random.random() < 0.45 else None,
            city=random.choice(INDIAN_CITIES),
            source=random.choice(LEAD_SOURCES),
            status=status,
            budget=float(random.randint(*budget_band)),
            customer_type=cust_type,
            notes=fake.sentence(nb_words=12),
            assigned_to=random.choice(sales_users).id,
            created_at=now - timedelta(days=random.randint(0, 120)),
            updated_at=now - timedelta(days=random.randint(0, 30)),
        )
        db.add(lead)
        leads.append(lead)
    db.commit()
    for lead in leads:
        db.refresh(lead)
    return leads


def seed_activities(db, leads, users, n=100):
    types = ["Note", "Call", "Email", "Status Change", "Meeting"]
    for _ in range(n):
        lead = random.choice(leads)
        db.add(Activity(
            lead_id=lead.id,
            activity_type=random.choice(types),
            description=fake.sentence(nb_words=14),
            created_by=random.choice(users).id,
            created_at=datetime.now(timezone.utc) - timedelta(days=random.randint(0, 60)),
        ))
    db.commit()


def seed_calls(db, leads, n=100):
    statuses = ["Completed", "Missed", "No Answer", "Voicemail"]
    for _ in range(n):
        lead = random.choice(leads)
        db.add(Call(
            lead_id=lead.id,
            call_duration=random.randint(15, 1200),
            call_status=random.choice(statuses),
            call_summary=fake.sentence(nb_words=12),
            created_at=datetime.now(timezone.utc) - timedelta(days=random.randint(0, 90)),
        ))
    db.commit()


def seed_tasks(db, leads, users, n=50):
    titles = [
        "Send bridal catalogue", "Call back for follow up", "Share gold rate update",
        "Schedule showroom visit", "Send quotation document", "Confirm GST details",
        "Arrange diamond viewing", "Negotiate making charges", "Send invoice",
        "Festive offer follow up",
    ]
    statuses = ["Open", "In Progress", "Completed", "Cancelled"]
    priorities = ["Low", "Medium", "High"]
    now = datetime.now(timezone.utc)
    for _ in range(n):
        lead = random.choice(leads)
        db.add(Task(
            lead_id=lead.id,
            assigned_to=random.choice(users).id,
            title=random.choice(titles),
            description=fake.sentence(nb_words=10),
            priority=random.choice(priorities),
            status=random.choices(statuses, weights=[40, 25, 30, 5])[0],
            due_date=now + timedelta(days=random.randint(-5, 30)),
            created_at=now - timedelta(days=random.randint(0, 30)),
        ))
    db.commit()


def seed_whatsapp(db, leads, n_conversations=20):
    chosen = random.sample(leads, k=min(n_conversations, len(leads)))
    for lead in chosen:
        msg_count = random.randint(4, 10)
        base_time = datetime.now(timezone.utc) - timedelta(days=random.randint(1, 30))
        for i in range(msg_count):
            direction, template = random.choice(WHATSAPP_TEMPLATES)
            text = template.format(
                brand=random.choice(AGENCY_BRANDS),
                rate=random.randint(25000, 50000),
                budget=f"{random.randint(40_000, 2_00_000):,}",
                qt=f"QT-{datetime.now().year}-{random.randint(10000, 99999)}",
            )
            db.add(WhatsappMessage(
                lead_id=lead.id, direction=direction, message=text,
                created_at=base_time + timedelta(minutes=i * random.randint(5, 240)),
            ))
    db.commit()


def seed_appointments(db, leads, n=30):
    now = datetime.now(timezone.utc)
    for _ in range(n):
        lead = random.choice(leads)
        db.add(Appointment(
            customer_name=lead.name,
            lead_id=lead.id,
            appointment_date=now + timedelta(days=random.randint(-10, 30),
                                             hours=random.randint(0, 8)),
            showroom_visit=random.random() > 0.2,
            notes=fake.sentence(nb_words=10),
        ))
    db.commit()


def seed_quotations(db, leads, n=40):
    year = datetime.now(timezone.utc).year
    statuses = ["Draft", "Sent", "Accepted", "Rejected"]
    for i in range(n):
        lead = random.choice(leads)
        db.add(Quotation(
            lead_id=lead.id,
            quotation_number=f"QT-{year}-{i+1:05d}",
            amount=float(random.randint(50_000, 50_00_000)),
            status=random.choice(statuses),
            created_at=datetime.now(timezone.utc) - timedelta(days=random.randint(0, 60)),
        ))
    db.commit()


def seed_ai_logs(db, leads, n=40):
    for _ in range(n):
        lead = random.choice(leads)
        db.add(AIAgentLog(
            lead_id=lead.id,
            conversation_summary=fake.paragraph(nb_sentences=2),
            sentiment=random.choice(SENTIMENTS),
            next_action=random.choice(NEXT_ACTIONS),
            created_at=datetime.now(timezone.utc) - timedelta(days=random.randint(0, 30)),
        ))
    db.commit()


def seed_notifications(db, users):
    titles = [
        "New lead assigned",
        "Task due tomorrow",
        "Quotation accepted",
        "Walk-in appointment scheduled",
        "AI agent flagged a hot lead",
    ]
    for u in users:
        for _ in range(random.randint(2, 5)):
            db.add(Notification(
                user_id=u.id,
                title=random.choice(titles),
                message=fake.sentence(nb_words=10),
                is_read=random.random() > 0.6,
                created_at=datetime.now(timezone.utc) - timedelta(hours=random.randint(0, 96)),
            ))
    db.commit()


def main():
    keep = "--keep" in sys.argv
    db = SessionLocal()
    try:
        if not keep:
            print(">> Dropping & recreating schema...")
            reset_database()
        else:
            Base.metadata.create_all(bind=engine)
            if db.query(User).count() > 0:
                print(">> --keep set and DB already populated; skipping.")
                return

        print(">> Seeding users...")
        users = seed_users(db)
        sales = [u for u in users if u.role in ("Sales", "Manager")]

        print(">> Seeding products...")
        seed_products(db, n=40)

        print(">> Seeding leads...")
        leads = seed_leads(db, sales_users=sales, n=100)

        print(">> Seeding activities...")
        seed_activities(db, leads=leads, users=users, n=100)

        print(">> Seeding calls...")
        seed_calls(db, leads=leads, n=100)

        print(">> Seeding tasks...")
        seed_tasks(db, leads=leads, users=sales, n=50)

        print(">> Seeding WhatsApp conversations...")
        seed_whatsapp(db, leads=leads, n_conversations=20)

        print(">> Seeding appointments...")
        seed_appointments(db, leads=leads, n=30)

        print(">> Seeding quotations...")
        seed_quotations(db, leads=leads, n=40)

        print(">> Seeding AI agent logs...")
        seed_ai_logs(db, leads=leads, n=40)

        print(">> Seeding notifications...")
        seed_notifications(db, users=users)

        print("Done. Login: admin@parshwebcraft.com / password123")
    finally:
        db.close()


if __name__ == "__main__":
    main()
