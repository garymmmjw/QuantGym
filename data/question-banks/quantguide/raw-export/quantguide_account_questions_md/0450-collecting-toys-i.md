# QuantGuide Question

## 450. Collecting Toys I

**Metadata**

- ID: `nFUv9Z69cMm9RIz1TfEk`
- URL: https://www.quantguide.io/questions/collecting-toys-i
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: DRW, Jane Street, TransMarket Group, Optiver, Citadel, Morgan Stanley
- Source: N/A
- Tags: Expected Value
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Every box of cereal contains one toy from a group of five distinct toys, each of which is mutually independent from the others and is equally likely to be within a given box. On average, how many boxes of cereal will you need to open in order to collect all five toys?

### Hint

Choosing a distinct toy on each new box follows a geometric distribution. What is the expected value of a geometric distribution?

### 解答

Choosing a distinct toy on each new box follows a geometric distribution. For the first distinct toy, we know that the first box we open will be a new toy. For the second distinct toy, there is a $\frac{4}{5}$ probability of receiving a new toy; thus, it should take $\frac{5}{4}$ boxes on average to receive a new toy. This logic follows for the third ($\frac{5}{3}$), fourth ($\frac{5}{2}$), and fifth ($\frac{5}{1}$) toy. Hence, the total number of boxes we opened on average to collect all five toys is: $$1 + \frac{5}{4} + \frac{5}{3} + \frac{5}{2} + \frac{5}{1} = \frac{137}{12}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "137/12"
    ],
    "companies": [
      {
        "company": "DRW"
      },
      {
        "company": "Jane Street"
      },
      {
        "company": "TransMarket Group"
      },
      {
        "company": "Optiver"
      },
      {
        "company": "Citadel"
      },
      {
        "company": "Morgan Stanley"
      }
    ],
    "difficulty": "medium",
    "id": "nFUv9Z69cMm9RIz1TfEk",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 3583869,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Collecting Toys I",
    "topic": "probability",
    "urlEnding": "collecting-toys-i"
  },
  "list_summary": {
    "companies": [
      {
        "company": "DRW"
      },
      {
        "company": "Jane Street"
      },
      {
        "company": "TransMarket Group"
      },
      {
        "company": "Optiver"
      },
      {
        "company": "Citadel"
      },
      {
        "company": "Morgan Stanley"
      }
    ],
    "difficulty": "medium",
    "id": "nFUv9Z69cMm9RIz1TfEk",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Collecting Toys I",
    "topic": "probability",
    "urlEnding": "collecting-toys-i"
  }
}
```
