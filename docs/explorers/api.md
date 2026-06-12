## API Documentation

Both XDCScan and Apothem Explorer provide REST APIs for programmatic access to blockchain data. The API enables integration with wallets, dashboards, trading bots, and analytics platforms.

### API Key Setup

**Creating an API Key:**

1. Create an account on XDCScan (registration required)
2. Navigate to **API Keys** in account settings
3. Click **Create API Key**
4. Name your key (e.g., "Production Dashboard")
5. Copy the generated key immediately (shown only once)

**Rate Limits:**

| Plan | Requests per Second | Daily Limit |
|------|---------------------|-------------|
| Free | 5 | 10,000 |
| Standard | 10 | 100,000 |
| Professional | 25 | 500,000 |
| Enterprise | Custom | Custom |

**Authentication:**

Include the API key as a query parameter:

```
https://xdcscan.io/api?module=account&action=balance&address=xdc1234...&apikey=YourApiKey
```

### Core API Endpoints

#### Account Module

**Get XDC Balance:**

```
GET /api?module=account&action=balance&address={address}&tag=latest&apikey={key}
```

Response:

```json
{
  "status": "1",
  "message": "OK",
  "result": "1000000000000000000"
}
```

**Get Transaction List:**

```
GET /api?module=account&action=txlist&address={address}&startblock=0&endblock=99999999&sort=asc&apikey={key}
```

**Get Token Transfer Events:**

```
GET /api?module=account&action=tokentx&contractaddress={token}&address={holder}&page=1&offset=100&apikey={key}
```

**Get Token Balance:**

```
GET /api?module=account&action=tokenbalance&contractaddress={token}&address={holder}&tag=latest&apikey={key}
```

#### Contract Module

**Get Contract ABI:**

```
GET /api?module=contract&action=getabi&address={contract}&apikey={key}
```

Response:

```json
{
  "status": "1",
  "message": "OK",
  "result": "[{...}]"
}
```

**Get Contract Source Code:**

```
GET /api?module=contract&action=getsourcecode&address={contract}&apikey={key}
```

#### Transaction Module

**Get Transaction Receipt Status:**

```
GET /api?module=transaction&action=gettxreceiptstatus&txhash={hash}&apikey={key}
```

**Get Transaction Status:**

```
GET /api?module=transaction&action=getstatus&txhash={hash}&apikey={key}
```

#### Block Module

**Get Block Reward:**

```
GET /api?module=block&action=getblockreward&blockno={number}&apikey={key}
```

**Get Block Countdown:**

```
GET /api?module=block&action=getblockcountdown&blockno={number}&apikey={key}
```

#### Stats Module

**Get XDC Supply:**

```
GET /api?module=stats&action=xdcsupply&apikey={key}
```

**Get Validators:**

```
GET /api?module=stats&action=validators&apikey={key}
```

### API Response Format

All API responses follow a standard JSON structure:

```json
{
  "status": "1",
  "message": "OK",
  "result": "..."
}
```

**Status Codes:**

| Status | Meaning |
|--------|---------|
| "1" | Success |
| "0" | Error or no data |

**Error Handling:**

```javascript
const response = await fetch(apiUrl);
const data = await response.json();

if (data.status === "0") {
  console.error("API Error:", data.message);
  // Handle error: rate limit, invalid parameters, etc.
} else {
  // Process data.result
}
```

### Python API Client Example

```python
import requests

API_KEY = "YourApiKey"
BASE_URL = "https://xdcscan.io/api"

def get_balance(address):
    params = {
        "module": "account",
        "action": "balance",
        "address": address,
        "tag": "latest",
        "apikey": API_KEY
    }
    response = requests.get(BASE_URL, params=params)
    data = response.json()
    
    if data["status"] == "1":
        # Convert wei to XDC
        balance_xdc = int(data["result"]) / 10**18
        return balance_xdc
    else:
        raise Exception(f"API Error: {data['message']}")

# Example usage
address = "xdc1234567890abcdef1234567890abcdef12345678"
balance = get_balance(address)
print(f"Balance: {balance} XDC")
```

### JavaScript API Client Example

```javascript
const API_KEY = "YourApiKey";
const BASE_URL = "https://xdcscan.io/api";

async function getTransactions(address, page = 1, offset = 10) {
  const params = new URLSearchParams({
    module: "account",
    action: "txlist",
    address: address,
    startblock: "0",
    endblock: "99999999",
    page: page.toString(),
    offset: offset.toString(),
    sort: "desc",
    apikey: API_KEY
  });
  
  const response = await fetch(`${BASE_URL}?${params}`);
  const data = await response.json();
  
  if (data.status === "1") {
    return data.result.map(tx => ({
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: parseInt(tx.value) / 1e18,
      timestamp: new Date(parseInt(tx.timeStamp) * 1000),
      gasUsed: tx.gasUsed,
      status: tx.txreceipt_status === "1" ? "Success" : "Failed"
    }));
  } else {
    throw new Error(data.message);
  }
}

// Example usage
getTransactions("xdc1234...abcd", 1, 5)
  .then(txs => console.log(txs))
  .catch(err => console.error(err));
```

---

