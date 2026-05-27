# QuantGuide Question

## 650. Plane Boarding

**Metadata**

- ID: `CKzRAADYurDUwZIrYGPm`
- URL: https://www.quantguide.io/questions/plane-boarding
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Citadel, IMC
- Source: N/A
- Tags: Conditional Probability
- Premium: True
- Solution Free: False
- Version: 3
- Last Edited: 2023-11-5 00:37:48 America/New_York
- Last Edited By: Gabe

### 题干

100 people are in line waiting to board a plane. Let us define the $i$th passenger in line as having a ticket for plane seat $i$. Intoxicated, the first passenger in line picks a random seat on the plane to sit on with equal probability. The other 99 passengers are sober, and will sit in their assigned seat unless taken, in which they will sit in a random free seat. You are the last person in line. What is the probability that you end up in your assigned seat?

### Hint

This can be solved with symmetry- try considering only your seat and the drunk passenger's seat.

### 解答

This can be solved with symmetry. Consider your seat and the drunk passenger's seat. Either your seat is taken before the drunk passenger's seat, or the drunk passenger's seat is taken before your seat. Because there is nothing special about your seat or the drunk passenger's seat, each passenger that has to make a random choice of seats will have an equal probability of filling either your seat or the drunk passenger's seat, assuming both are vacant. Hence, the probability is $\frac{1}{2}.$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0.5"
    ],
    "companies": [
      {
        "company": "Citadel"
      },
      {
        "company": "IMC"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "CKzRAADYurDUwZIrYGPm",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-5 00:37:48 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5217734,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Plane Boarding",
    "topic": "probability",
    "urlEnding": "plane-boarding",
    "version": 3
  },
  "list_summary": {
    "companies": [
      {
        "company": "Citadel"
      },
      {
        "company": "IMC"
      }
    ],
    "difficulty": "medium",
    "id": "CKzRAADYurDUwZIrYGPm",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Plane Boarding",
    "topic": "probability",
    "urlEnding": "plane-boarding"
  }
}
```
