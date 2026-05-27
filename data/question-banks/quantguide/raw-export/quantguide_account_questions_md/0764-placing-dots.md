# QuantGuide Question

## 764. Placing Dots

**Metadata**

- ID: `0n1HVhbPSEruRFNDHgbs`
- URL: https://www.quantguide.io/questions/placing-dots
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: N/A
- Tags: Combinatorics, Conditional Probability
- Premium: False
- Solution Free: False
- Version: 4
- Last Edited: 2023-8-27 10:21:42 America/New_York
- Last Edited By: Michael

### 题干

You place three dots along four edges of a square at random. What is the probability that the dots lie on distinct edges?

### Hint

Break down the problem by each dot. What is the probability the first dot is put on a distinct edge? What is the probability the second dot is put on a distinct edge? What is the probability the third dot is put on a distinct edge? How can you combine these probabilities to come to a final answer?

### 解答

The first dot will always be placed on a distinct edge. The second dot has a $\frac{3}{4}$ chance of being placed on a distinct edge. The third dot has a $\frac{2}{4}$ chance of being placed on a distinct edge. Thus, the probability that the three dots all lie on distinct edges is:$$1 \times \frac{3}{4} \times \frac{2}{4} = \frac{3}{8}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "3/8"
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "0n1HVhbPSEruRFNDHgbs",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-27 10:21:42 America/New_York",
    "lastEditedBy": "Michael",
    "orderId": 6238860,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Placing Dots",
    "topic": "probability",
    "urlEnding": "placing-dots",
    "version": 4
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "0n1HVhbPSEruRFNDHgbs",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Placing Dots",
    "topic": "probability",
    "urlEnding": "placing-dots"
  }
}
```
