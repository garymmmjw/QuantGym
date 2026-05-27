# QuantGuide Question

## 197. Limiting Values II

**Metadata**

- ID: `IbGr5fe0WGZyEpwczAUG`
- URL: https://www.quantguide.io/questions/limiting-values-ii
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Expected Value
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-3 12:35:52 America/New_York
- Last Edited By: Gabe

### 题干

You roll two fair dice until a sum other than $7$ appears and are paid that amount. What is the fair value of this game?

### Hint

The size of the sample space is reduced. How do the probabilities of each value change with this in mind?

### 解答

The size of the sample space is reduced from 36 to 30 since 7 appeared six times in the initial sample space.
The resulting probabilities associated with every roll:

$$2 \Rightarrow \frac{1}{30}$$
$$3 \Rightarrow \frac{2}{30}$$
$$4 \Rightarrow \frac{3}{30}$$
$$5 \Rightarrow \frac{4}{30}$$
$$6 \Rightarrow \frac{5}{30}$$
$$8 \Rightarrow \frac{5}{30}$$
$$9 \Rightarrow \frac{4}{30}$$
$$10 \Rightarrow \frac{3}{30}$$
$$11 \Rightarrow \frac{2}{30}$$
$$12 \Rightarrow \frac{1}{30}$$

The resulting expected value is:

$$\frac{1}{30}(2) + \frac{2}{30}(3) + \frac{3}{30}(4) + \frac{4}{30}(5) + \frac{5}{30}(6) + \frac{5}{30}(8) + \frac{4}{30}(9) + \frac{3}{30}(10) + \frac{2}{30}(11) + \frac{1}{30}(12) = 7$$

Intuitively, this makes sense since $7$ is the mean of the face values and the probabilities of the values are symmetric around $7$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "7"
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "IbGr5fe0WGZyEpwczAUG",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-3 12:35:52 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1501262,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Limiting Values II",
    "topic": "probability",
    "urlEnding": "limiting-values-ii",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "IbGr5fe0WGZyEpwczAUG",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Limiting Values II",
    "topic": "probability",
    "urlEnding": "limiting-values-ii"
  }
}
```
