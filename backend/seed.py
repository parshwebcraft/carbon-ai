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
                 role="Admin", is_active=True)
        db.add(u)
        user_objs.append(u)
    for name, email in sales:
        u = User(name=name, email=email, password_hash=hash_password("password123"),
                 role="Admin", is_active=True)
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


REAL_LEADS_DATA = [
    {"date": "26/12/2025", "source": "Self", "name": "Rahul Jain", "industry": "Blinkit MVP Clone", "value": 200000.0, "status": "Not Proceeded", "reason": "Budget", "converted": "No", "city": "Indore"},
    {"date": "07/01/2026", "source": "Mahaveer Mama", "name": "Hemant Bhat", "industry": "Taxi Services", "value": 9000.0, "status": "Completed", "reason": "Deal Closed", "converted": "Yes", "city": "Surat"},
    {"date": "21/02/2026", "source": "Self", "name": "Sip n Crunch Cafe", "industry": "Cafe", "value": 21000.0, "status": "May be Ongoing", "reason": "Deal in progress", "converted": "No", "city": "Indore"},
    {"date": "22/02/2026", "source": "Self", "name": "Anand Goswani", "industry": "Clothing Brand", "value": 11000.0, "status": "Completed", "reason": "Deal Closed", "converted": "Yes", "city": "Jaipur"},
    {"date": "08/03/2026", "source": "Instagram", "name": "Vishal Vairagi", "industry": "Paint Shop", "value": 22000.0, "status": "Ongoing", "reason": "Deal in progress", "converted": "Yes", "city": "Indore"},
    {"date": "15/03/2026", "source": "Self", "name": "Akshay Mandot", "industry": "Real estate", "value": 300000.0, "status": "Not Proceeded", "reason": "Makha Kanjus hai", "converted": "No", "city": "Delhi"},
    {"date": "17/03/2026", "source": "Self", "name": "Lalit Choudhary Him Cream Naturals", "industry": "Cafe", "value": 4000.0, "status": "Completed", "reason": "Deal Closed", "converted": "Yes", "city": "Mumbai"},
    {"date": "19/03/2026", "source": "Self", "name": "Raj Thakur", "industry": "Musician", "value": 35000.0, "status": "Not Proceeded", "reason": "Time nahi unke paas", "converted": "No", "city": "Ahmedabad"},
    {"date": "19/03/2026", "source": "Self", "name": "Manish Jain", "industry": "Retail Services", "value": 5000.0, "status": "Ongoing", "reason": "Deal in progress", "converted": "Yes", "city": "Chennai"},
    {"date": "24/03/2026", "source": "Sajan Mandot", "name": "Manish Dodech", "industry": "Garment Factory", "value": 500000.0, "status": "Not Proceeded", "reason": "Kanjus", "converted": "No", "city": "Indore"},
    {"date": "31/03/2026", "source": "Self", "name": "Saraswati Narayan Hospital", "industry": "Healthcare", "value": 50000.0, "status": "Not Proceeded", "reason": "Kanjus , Katha", "converted": "No", "city": "Mumbai"},
    {"date": "31/03/2026", "source": "Self", "name": "Dr. Abhay Jain Clinic", "industry": "Healthcare", "value": 30000.0, "status": "Not Proceeded", "reason": "Not Required of setup", "converted": "No", "city": "Jaipur"},
    {"date": "04/04/2026", "source": "Self", "name": "Nakoda Home Appliances Elica", "industry": "Home Appliances", "value": 25000.0, "status": "Not Proceeded", "reason": "Not Required", "converted": "No", "city": "Indore"},
    {"date": "04/04/2026", "source": "Self", "name": "Palak Bokadia", "industry": "Clothing Brand", "value": 25000.0, "status": "Not Proceeded", "reason": "Khud Engineer h", "converted": "No", "city": "Delhi"},
    {"date": "15/04/2026", "source": "Self", "name": "Parikshit Nagda", "industry": "Journal", "value": 8000.0, "status": "Ongoing", "reason": "Deal in progress", "converted": "Yes", "city": "Indore"},
    {"date": "17/04/2026", "source": "Self", "name": "Oswal Sabha", "industry": "Community Website", "value": 8000.0, "status": "Completed", "reason": "Deal Closed", "converted": "Yes", "city": "Surat"},
    {"date": "17/04/2026", "source": "Self", "name": "Manoj Lodha", "industry": "Jewellery Showroom", "value": 15000.0, "status": "Not Proceeded", "reason": "Time nahi unke paas", "converted": "No", "city": "Mumbai"},
    {"date": "21/04/2025", "source": "Hiya Porwal", "name": "Hemant Ji Porwal", "industry": "Jewellery Showroom", "value": 15000.0, "status": "Not Proceeded", "reason": "Hiya Jane", "converted": "No", "city": "Jaipur"},
    {"date": "03/04/2026", "source": "Self", "name": "Mahapragya Vihar", "industry": "Stay Management", "value": 10000.0, "status": "Completed", "reason": "Trust on my work", "converted": "Yes", "city": "Indore"},
    {"date": "07/05/2026", "source": "Self", "name": "ATDC Udaipur", "industry": "Hospital Management", "value": 12500.0, "status": "Ongoing", "reason": "Trust on my work", "converted": "Yes", "city": "Udaipur"},
    {"date": "08/05/2026", "source": "Self", "name": "Strong Fit Gym", "industry": "Fitness Gym", "value": 15000.0, "status": "Not Proceeded", "reason": "Budget", "converted": "No", "city": "Indore"},
    {"date": "04/06/2026", "source": "Self", "name": "Yuvraj Pachori", "industry": "Digital News Media", "value": 6000.0, "status": "Ongoing", "reason": "Deal in progress", "converted": "Yes", "city": "Delhi"},
    {"date": "25/06/2026", "source": "Instagram", "name": "Chintransh Rathore", "industry": "Restaurant", "value": 0.0, "status": "Not Proceeded", "reason": "Not responded", "converted": "No", "city": "Indore"},
    {"date": "30/06/2026", "source": "Instagram", "name": "Shweta usa Client", "industry": "Chocolate Shop", "value": 0.0, "status": "Call is in process", "reason": "Deal in progress", "converted": "No", "city": "Jaipur"},
    {"date": "07/07/2026", "source": "Thread", "name": "Richa Dave", "industry": "Jewellery Showroom", "value": 0.0, "status": "Call is in process", "reason": "Deal in progress", "converted": "No", "city": "Indore"},
    {"date": "09/07/2026", "source": "Meta Ads", "name": "Sarthak Shirke", "industry": "Electrical contractor", "value": 10000.0, "status": "Call is in process", "reason": "Deal in progress", "converted": "No", "city": "Mumbai"},
    {"date": "10/07/2026", "source": "Instagram", "name": "Arijit Singh", "industry": "Clothing Brand", "value": 0.0, "status": "Call is in process", "reason": "Not responded", "converted": "No", "city": "Delhi"}
]


def seed_leads(db, sales_users, n=100):
    leads = []
    for item in REAL_LEADS_DATA:
        dt = datetime.strptime(item["date"], "%d/%m/%Y")
        lead = Lead(
            name=item["name"],
            phone=f"+91{random.randint(7000000000, 9999999999)}",
            email=f"{item['name'].lower().replace(' ', '')}@example.com",
            company=item["industry"],
            city=item["city"],
            source=item["source"],
            status=item["status"],
            budget=item["value"],
            customer_type=item["industry"],
            notes=f"Reason: {item['reason']} | Converted: {item['converted']}",
            assigned_to=random.choice(sales_users).id,
            created_at=dt,
            updated_at=dt,
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
    task_templates = {
        "Send proposal document": [
            "Prepare and send the comprehensive agency services proposal with custom scope of work.",
            "Draft the custom software development proposal details and email to client for review.",
            "Update the proposal with the revised budget and send via CRM link."
        ],
        "Call back for follow up": [
            "Follow up on the pending WhatsApp proposal and discuss any scope adjustments.",
            "Call the lead to answer their questions about our WordPress design package.",
            "Follow up after their team discussion regarding mobile app timeline."
        ],
        "Send speed audit report": [
            "Perform PageSpeed Insights audit and send a PDF listing critical LCP and rendering improvements.",
            "Analyze current website load time and share suggestions for database indexing optimization.",
            "Send the performance audit highlighting Shopify store speed fixes."
        ],
        "Schedule discovery meeting": [
            "Coordinate with the stakeholder to schedule a 30-minute requirement gathering meeting.",
            "Send calendar invite for the discovery call to discuss app architecture.",
            "Schedule initial Zoom call to align on custom web development needs."
        ],
        "Confirm contract terms": [
            "Confirm the SLA clauses and payment schedule before drafting the final contract.",
            "Discuss the intellectual property rights ownership clause with the client.",
            "Align on contract termination terms and project handoff guidelines."
        ],
        "Confirm GST details": [
            "Request the corporate billing address and official GSTIN number for tax compliance.",
            "Validate client's GST details on the portal for invoice generation.",
            "Verify tax billing information with the accounts team."
        ],
        "Arrange portfolio review": [
            "Share case studies of our past successful e-commerce projects and digital agency portfolios.",
            "Arrange a video walk-through of the custom CRM portals we previously built.",
            "Send dashboard mockup samples and SaaS layouts we designed."
        ],
        "Negotiate project timeline": [
            "Discuss phase-wise milestones and agree on a realistic deadline for beta testing.",
            "Negotiate UI/UX feedback cycles to shorten the app development timeline.",
            "Align developer availability with the client's marketing launch schedule."
        ],
        "Send initial invoice": [
            "Raise a 30% milestone advance invoice for custom software development kickoff.",
            "Send the first monthly invoice for SEO & marketing services retention.",
            "Generate invoice for the graphics design and wireframing completed phase."
        ],
        "Follow up on proposal": [
            "Touch base to see if they had a chance to review the React app development cost estimate.",
            "Follow up on the mobile app proposal sent last Thursday.",
            "Send a message checking on proposal approval status."
        ]
    }
    titles = list(task_templates.keys())
    statuses = ["Open", "In Progress", "Completed", "Cancelled"]
    priorities = ["Low", "Medium", "High"]
    now = datetime.now(timezone.utc)
    for _ in range(n):
        lead = random.choice(leads)
        title = random.choice(titles)
        description = random.choice(task_templates[title])
        db.add(Task(
            lead_id=lead.id,
            assigned_to=random.choice(users).id,
            title=title,
            description=description,
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
            seed_automation(db)
            if db.query(User).count() > 0:
                print(">> --keep set and DB already populated; skipping.")
                return

        print(">> Seeding users...")
        users = seed_users(db)
        sales = users

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

        print(">> Seeding automations...")
        seed_automation(db)

        print("Done. Login: admin@parshwebcraft.com / password123")
    finally:
        db.close()


def seed_automation(db):
    from models import Integration, Workflow
    import json
    
    # Seeding default integrations
    if db.query(Integration).count() == 0:
        default_apps = [
            ("whatsapp", True, "", "", ""),
            ("google_sheets", False, "", "", ""),
            ("excel", False, "", "", ""),
            ("smtp", True, json.dumps({"host": "smtp.gmail.com", "port": 587, "username": "noreply@parshwebcraft.com", "password": "password", "sender": "noreply@parshwebcraft.com"}), "", ""),
            ("openai", True, "sk-proj-mockkey12345", "", ""),
            ("deepseek", False, "", "", ""),
            ("vapi", False, "", "", ""),
            ("google_calendar", False, "", "", ""),
            ("rest_api", False, "", "", ""),
            ("webhook", False, "", "", "")
        ]
        for app, enabled, api_key, secret_key, webhook_url in default_apps:
            db.add(Integration(app_name=app, enabled=enabled, api_key=api_key, secret_key=secret_key, webhook_url=webhook_url))
            
    # Seeding a few sample workflows
    if db.query(Workflow).count() == 0:
        workflows = [
            ("Auto WhatsApp Followup", "lead_created", [
                {"type": "send_whatsapp", "to_number": "{{phone}}", "message_body": "Hi {{name}}, thank you for reaching out to ParshWebCraft! We received your request and will contact you shortly."}
            ], True),
            ("High Priority Alert", "lead_created", [
                {"type": "notify_manager", "title": "New Lead Alert", "message": "High budget lead {{name}} has contacted us from {{city}}."}
            ], True),
            ("Quotation Generated Dispatch", "quotation_generated", [
                {"type": "send_email", "recipient": "{{lead_email}}", "subject": "Your Quote is Ready", "body": "Dear {{lead_name}},\n\nYour quotation for amount ₹{{amount}} has been generated successfully.\n\nWarm regards,\nFinance Team"}
            ], False),
        ]
        for name, trigger_type, actions_list, enabled in workflows:
            db.add(Workflow(name=name, trigger_type=trigger_type, actions=json.dumps(actions_list), enabled=enabled))
    db.commit()


if __name__ == "__main__":
    main()
