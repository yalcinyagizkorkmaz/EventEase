import requests
import json

# Test için basit bir script
BASE_URL = "http://localhost:8000"

def test_health():
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"Health check: {response.status_code}")
        print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Health check failed: {e}")

def test_events():
    try:
        response = requests.get(f"{BASE_URL}/events/")
        print(f"Events: {response.status_code}")
        events = response.json()
        print(f"Found {len(events)} events")
        for event in events:
            print(f"- {event.get('title', 'No title')} (ID: {event.get('id', 'No ID')})")
    except Exception as e:
        print(f"Events failed: {e}")

def test_attending_events():
    try:
        # Mock token ile test
        headers = {"Authorization": "Bearer mock-token"}
        response = requests.get(f"{BASE_URL}/events/attending", headers=headers)
        print(f"Attending events: {response.status_code}")
        if response.status_code == 200:
            events = response.json()
            print(f"Found {len(events)} attending events")
            for event in events:
                print(f"- {event.get('title', 'No title')} (ID: {event.get('id', 'No ID')})")
        else:
            print(f"Error: {response.text}")
    except Exception as e:
        print(f"Attending events failed: {e}")

if __name__ == "__main__":
    print("Testing API endpoints...")
    test_health()
    test_events()
    test_attending_events() 