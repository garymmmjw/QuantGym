# QuantGuide Question

## 662. Signed Correlation

**Metadata**

- ID: `c1uEKCzBe2wC9GS3DA9E`
- URL: https://www.quantguide.io/questions/signed-correlation
- Topic: statistics
- Difficulty: easy
- Internal Difficulty: 1
- Companies: SIG
- Source: og
- Tags: Covariance
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-17 19:27:42 America/New_York
- Last Edited By: Gabe

### 题干

Let $X$ and $Y$ be two random variables with $\text{Corr}(X,Y) = -0.4$. If possible, find $\text{Corr}(3X+1,1-Y)$. If it is not possible, enter $100$.

### Hint

Correlation is a measure of linear association between $X$ and $Y$. It is unaffected by scaling and shifting.

### 解答

Correlation is a measure of linear association between $X$ and $Y$ that is unaffected by scaling and shifting. Thus, we have that $\text{Corr}(aX+b,cY+d) = \text{sign}(ac)\text{Corr}(X,Y)$. In this case, $\text{sign}(ac) = -1$, so our answer is $-1 \cdot -0.4 = 0.4$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0.4"
    ],
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "c1uEKCzBe2wC9GS3DA9E",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-17 19:27:42 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5322148,
    "source": "og",
    "status": "published",
    "tags": [
      {
        "tag": "Covariance"
      }
    ],
    "title": "Signed Correlation",
    "topic": "statistics",
    "urlEnding": "signed-correlation",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "id": "c1uEKCzBe2wC9GS3DA9E",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Covariance"
      }
    ],
    "title": "Signed Correlation",
    "topic": "statistics",
    "urlEnding": "signed-correlation"
  }
}
```
