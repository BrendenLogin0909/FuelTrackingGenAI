# Fuel Tracking MVP — UAT Scenarios

## Scenario 1: Add transaction via photo (happy path)

**As a** car owner  
**I want to** add a fuel transaction by photographing my receipt  
**So that** I can track fuel costs with minimal effort  

**Given** I am on the Add transaction page  
**When** I tap "Take photo" and capture a receipt image  
**Then** the system extracts data from the image  
**And** the transaction is saved automatically  
**And** I see a form pre-filled with extracted values  
**And** I can edit and save corrections if needed  

---

## Scenario 2: Add transaction via manual entry

**As a** car owner  
**I want to** enter a fuel transaction manually  
**So that** I can record data when I don't have a receipt  

**Given** I am on the Add transaction page  
**When** I tap "Enter manually"  
**Then** I see a form with date, litres, total cost, odometer fields  
**When** I fill in litres (45.2), total cost (85.50), odometer (125000)  
**And** I tap Save  
**Then** the transaction is saved  
**And** I am redirected to the dashboard  

---

## Scenario 3: View fuel efficiency metrics

**As a** car owner  
**I want to** see my latest fuel efficiency  
**So that** I can monitor my vehicle's consumption  

**Given** I have at least two transactions with odometer and litres  
**When** I view the dashboard  
**Then** I see "Latest efficiency" in L/100km  
**And** I see "Average efficiency" when multiple fill-ups exist  
**When** I have insufficient data (e.g. no odometer)  
**Then** I see "N/A" for efficiency metrics  

---

## Scenario 4: Edit existing transaction

**As a** car owner  
**I want to** correct a transaction I entered  
**So that** my records are accurate  

**Given** I have saved transactions  
**When** I tap a transaction from the recent list  
**Then** I see the edit form with existing values  
**When** I change the odometer reading and save  
**Then** the transaction is updated  
**And** metrics are recalculated  

---

## Scenario 5: OCR failure / incomplete extraction

**As a** car owner  
**I want to** still save my transaction when OCR fails  
**So that** I don't lose my data  

**Given** I upload a blurry or unreadable receipt  
**When** OCR cannot extract data  
**Then** the system saves the image with the transaction  
**And** I see a form with today's date and empty fields  
**And** I can manually enter the data and save  
