# QuantGuide Question

## 669. Bacterial Survival I

**Metadata**

- ID: `57kfcfn3PTsvMHSMzYCy`
- URL: https://www.quantguide.io/questions/bacterial-survival-i
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: N/A
- Tags: Conditional Probability
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-8-26 14:13:12 America/New_York
- Last Edited By: Gabe

### 题干

Suppose that a colony of bacteria starts with 1 cell. Each generation, each living cell, independently of all other cells, will either die with no offspring or produce some random positive integer number of offspring.  The probability that the colony with one bacteria will go extinct at some point in the future is $\dfrac{1}{3}$. Find the probability that the colony starting with 3 cells goes extinct at some point.

### Hint

Consider each cell as an independent lineage.

### 解答

If the colony with one cell goes extinct with probability $\dfrac{1}{3}$, then for a colony starting with three cells to go extinct, you can view this as saying the independent lineages of each of the three cells must go extinct. The probability for each that it goes extinct at some point is $\dfrac{1}{3}$, so for all three to go extinct, as they are independent, the probability is $\dfrac{1}{3} \cdot \dfrac{1}{3} \cdot \dfrac{1}{3} = \dfrac{1}{27}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/27"
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "57kfcfn3PTsvMHSMzYCy",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 14:13:12 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5370994,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Bacterial Survival I",
    "topic": "probability",
    "urlEnding": "bacterial-survival-i",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "57kfcfn3PTsvMHSMzYCy",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Bacterial Survival I",
    "topic": "probability",
    "urlEnding": "bacterial-survival-i"
  }
}
```
