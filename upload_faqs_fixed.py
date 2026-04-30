"""
FAQ Embedding Uploader → Qdrant (Fixed for n8n)
================================================
Re-uploads with 'pageContent' field that n8n expects.

Prerequisites:
  pip install openai qdrant-client

Usage:
  export OPENAI_API_KEY="your-key" QDRANT_API_KEY="your-key"
  python upload_faqs_fixed.py
"""

import os
import uuid
import json
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct

# ─── CONFIG ───────────────────────────────────────────────────────────────────
# Set these via environment variables:
#   export QDRANT_URL="https://your-qdrant-instance.com"
#   export QDRANT_API_KEY="your-api-key"
#   export OPENAI_API_KEY="your-openai-key"
QDRANT_URL = os.getenv("QDRANT_URL", "https://your-qdrant-instance.com")
COLLECTION_NAME = "demo-store-faqs"

# ─── FAQ DATA ─────────────────────────────────────────────────────────────────
# Sample FAQ data for a demo retail/wholesale store
PDF_FAQS = [
    {"question": "What is Demo Store?", "answer": "Demo Store is a mobile ordering application exclusively for small retail store owners. You can order inventory directly from your phone.", "topic": "About Demo Store"},
    {"question": "How complete is your product catalog?", "answer": "We carry 80-90% of typical store inventory with over 2,000 products. We do not carry cigarettes.", "topic": "Products"},
    {"question": "Do you offer free delivery?", "answer": "Yes, we provide free delivery for all orders. Simply place your order through the app and we'll deliver to your store.", "topic": "Delivery"},
    {"question": "What is the minimum purchase amount?", "answer": "There is a minimum order amount required for each order. The specific amount will be shown in the app at checkout.", "topic": "Ordering"},
    {"question": "When will my order be delivered?", "answer": "Same-day delivery for orders placed before 10AM cutoff. Orders placed after 10AM will be delivered the next day. No delivery on Sundays.", "topic": "Delivery"},
    {"question": "Is there a minimum quantity per product?", "answer": "Most products can be ordered per piece. Some items may have minimum order requirements. Any SKU that meets the minimum order amount can be ordered.", "topic": "Products"},
    {"question": "How are your prices compared to other stores?", "answer": "We offer wholesale prices, so our rates are more affordable compared to malls and grocery stores.", "topic": "Pricing"},
    {"question": "How do I know if my order was received?", "answer": "You will see a success confirmation at the end of your order in the app, meaning we have received your order. You will also receive a notification once we open your order.", "topic": "Ordering"},
    {"question": "What are your payment terms?", "answer": "We accept cash on delivery only.", "topic": "Payment"},
    {"question": "Do you accept credit or debit cards?", "answer": "Currently, we do not accept credit or debit cards. Cash on delivery is the only payment option available.", "topic": "Payment"},
    {"question": "Do you offer points or rebates on orders?", "answer": "Yes, we offer loyalty points on select products. You can find eligible products under the 'Special Offers' category in the app.", "topic": "Rewards"},
    {"question": "Can I return damaged or bad orders?", "answer": "We replace items that arrive damaged from our side. However, we cannot accept returns for items that were purchased in good condition but remained unsold due to expiration or pest damage from your store.", "topic": "Returns"},
    {"question": "What if items are damaged or near expiry upon delivery?", "answer": "During unpacking and inspection, if our delivery team notices damaged items, there will be an outright deduction from your official receipt.", "topic": "Returns"},
    {"question": "Do you offer senior citizen discounts?", "answer": "We do not offer senior citizen discounts. However, our prices are already wholesale and include free delivery, so you still save money.", "topic": "Pricing"},
    {"question": "How do I return items if the delivery team has already left?", "answer": "Contact customer support for assistance. Our protocol is to return damaged items on your next delivery. For future transactions, either a deduction from your receipt or item replacement will be provided.", "topic": "Returns"},
    {"question": "Who can I contact for problems or questions?", "answer": "You can reach our customer support team. Contact us through our official channels or submit a support request through the app.", "topic": "Contact"},
]

XLSX_FAQS = [
    {"question": "How do I verify my account?", "answer": "We have reviewed your registration. Our agent will visit your store to verify the location and your account. This is a one-time visit. After verification, you can order anytime. We will forward your details to our team lead who will call you. If they are familiar with your location, verification can be done immediately. You will receive a call today or tomorrow.", "topic": "Verification"},
    {"question": "How do I recover my old account?", "answer": "We can recover your previous account. Steps: (1) Tap 'I already have an account. LOG IN'. (2) Tap 'FORGOT PASSWORD?'. (3) Enter your phone number (without zero at the start). (4) Create a new password. (5) Verify the OTP code. (6) Log in using your number and new password. If your account is inactive: Our development team will update your mobile number.", "topic": "Account"},
    {"question": "What is Demo Store and how do I join?", "answer": "Demo Store is exclusively for small retail store owners. We offer products at very affordable prices with free delivery. Download the Demo Store app and sign up. Message us immediately so we can visit your store location.", "topic": "About Demo Store"},
    {"question": "How do I place an order?", "answer": "To place an order, download the Demo Store app from the PlayStore and sign up. Message us or call us once signed up for next steps. We exclusively serve small retail stores.", "topic": "Ordering"},
    {"question": "When will my order arrive?", "answer": "Next day delivery for orders placed before the cutoff time. 2 days for orders placed after cutoff. No delivery on Sundays. We will follow up on your order. Once on the way, you can view the delivery schedule in the app under order history.", "topic": "Delivery"},
    {"question": "Can I return bad orders?", "answer": "We replace items damaged from our side. However, we cannot accept returns for items purchased in good condition but not sold due to expiration or pest damage.", "topic": "Returns"},
    {"question": "My order arrived but items are missing. They were available in the app.", "answer": "We apologize for this. Our operations have minimal workforce, especially in the warehouse. We are struggling to monitor inventory due to constant product turnover. We hope to adjust and return to normal operations soon.", "topic": "Missing Items"},
    {"question": "I placed an order, paid for it, but items are missing from the receipt.", "answer": "We will forward this to our team and update you on their response. We apologize. We will forward this to the warehouse for investigation. We will return the missing product if confirmed.", "topic": "Missing Items"},
    {"question": "I placed an order and noticed damage. Can I return for replacement?", "answer": "We will coordinate with our team and update you on their response. We will replace the damaged items. Simply return them to the delivery team on your next order.", "topic": "Returns"},
    {"question": "Can I add more items to my order?", "answer": "For additional orders, you must place a new order through the app. Another minimum order amount applies. All orders must go through the app. We will check if we can still add to your current order.", "topic": "Ordering"},
    {"question": "Can I order via SMS or messenger?", "answer": "Without an account: We only accept orders through the app. With an account: We can arrange alternative ordering methods if you are having trouble using the app. Please contact us to find a solution.", "topic": "Ordering"},
    {"question": "I have a container. How does the deposit work?", "answer": "Container deposits vary by product. The deposit amount will be shown at checkout and will be deducted from your total payment.", "topic": "Payment"},
    {"question": "Can I pay online?", "answer": "Currently, cash on delivery is our only payment option. We hope to offer online payment soon.", "topic": "Payment"},
    {"question": "Can I follow up on returned items for the next delivery?", "answer": "We will remind the warehouse about your product replacement. Hopefully it can be included in your next delivery.", "topic": "Returns"},
]

ALL_FAQS = PDF_FAQS + XLSX_FAQS


def main():
    print(f"\n{'='*60}")
    print(f"  Demo Store FAQ -> Qdrant (n8n Fixed)")
    print(f"{'='*60}\n")

    # 1. Generate embeddings with OpenAI
    print("[1/3] Generating embeddings...")
    from openai import OpenAI

    openai = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    # Build text for embedding - include both Q and A
    texts = [f"Q: {f['question']}\nA: {f['answer']}" for f in ALL_FAQS]

    response = openai.embeddings.create(model="text-embedding-3-small", input=texts)
    embeddings = [r.embedding for r in response.data]
    print(f"      Done. {len(embeddings)} embeddings\n")

    # 2. Connect to Qdrant
    print("[2/3] Connecting to Qdrant...")
    client = QdrantClient(url=QDRANT_URL, api_key=os.getenv("QDRANT_API_KEY"), timeout=30)

    # Delete and recreate collection
    try:
        client.delete_collection(COLLECTION_NAME)
        print(f"      Deleted old collection")
    except:
        pass

    client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=VectorParams(size=1536, distance=Distance.COSINE),
    )
    print(f"      Created collection '{COLLECTION_NAME}'\n")

    # 3. Upload with both 'text' and 'pageContent' fields
    print("[3/3] Uploading points...")
    points = []
    for i, (faq, vector) in enumerate(zip(ALL_FAQS, embeddings)):
        # n8n/LangChain often looks for 'text' by default, or 'pageContent'
        page_content = f"Question: {faq['question']}\n\nAnswer: {faq['answer']}"
        
        points.append(
            PointStruct(
                id=str(uuid.uuid4()),
                vector=vector,
                payload={
                    "text": page_content,         # Common default
                    "pageContent": page_content,  # Used by some versions
                    "content": page_content,      # Used by others
                    "metadata": {                 # Some versions expect nested metadata
                        "text": page_content,
                        "pageContent": page_content,
                        "content": page_content,
                        "question": faq["question"],
                        "answer": faq["answer"],
                        "topic": faq.get("topic", "general"),
                    },
                    "question": faq["question"],
                    "answer": faq["answer"],
                    "topic": faq.get("topic", "general"),
                },
            )
        )

    client.upsert(collection_name=COLLECTION_NAME, points=points, wait=True)
    print(f"      Uploaded {len(points)} points\n")

    # Verify
    info = client.get_collection(COLLECTION_NAME)
    print(f"{'='*60}")
    print(f"  Done! {len(points)} FAQs in Qdrant")
    print(f"  Collection: {COLLECTION_NAME}")
    print(f"  Points: {info.points_count}")
    print(f"  Content field: 'pageContent' (for n8n)")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    if not os.getenv("OPENAI_API_KEY") or not os.getenv("QDRANT_API_KEY"):
        print("Set these env vars:")
        print("  export OPENAI_API_KEY='...'")
        print("  export QDRANT_API_KEY='...'")
    else:
        main()