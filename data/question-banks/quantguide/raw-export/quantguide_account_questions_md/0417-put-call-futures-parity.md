# QuantGuide Question

## 417. Put Call Futures Parity

**Metadata**

- ID: `hMeoVloaWCyo42BSf3QN`
- URL: https://www.quantguide.io/questions/put-call-futures-parity
- Topic: finance
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: my brain
- Tags: Finance
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-10-29 22:00:37 America/New_York
- Last Edited By: Gabe

### 题干

If the $120$ call on an underlying is priced at $3$. The underlying future is priced at $110$, what price should the corresponding put at the $120$ strike be? 

### Hint

Put call parity shows that our put price - our call price must be equivalent to our strike price - our future's price.

### 解答

Our put call parity formula is given by $$$$
$\text{Future's Price} - \text{Call Price} + \text{Put Price} - \text{Strike Price} = 0$
$$$$
Solving for our $\text{Put Price}$, we get $\text{Put Price}$ = $-110 + 3 + 120 = 13$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "13"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "hMeoVloaWCyo42BSf3QN",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-29 22:00:37 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3265848,
    "source": "my brain",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Put Call Futures Parity",
    "topic": "finance",
    "urlEnding": "put-call-futures-parity",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "hMeoVloaWCyo42BSf3QN",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Put Call Futures Parity",
    "topic": "finance",
    "urlEnding": "put-call-futures-parity"
  }
}
```
