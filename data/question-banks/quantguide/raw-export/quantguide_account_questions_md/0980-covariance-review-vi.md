# QuantGuide Question

## 980. Covariance Review VI

**Metadata**

- ID: `y3VGok7RKTIHCCLKu3Pi`
- URL: https://www.quantguide.io/questions/covariance-review-vi
- Topic: statistics
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: Wackerly
- Tags: Covariance
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-7 23:31:33 America/New_York
- Last Edited By: Gabe

### 题干

Suppose that $Z \sim N(0, 1)$ and $Y \sim \chi^2(\nu)$ are independent. Define $W = Z / \sqrt{Y}$. Compute $\text{Cov}(Y, W)$. 

### Hint

Use the independence of $Y$ and $Z$ and substitute in the definition of $W$ after using the definition of covariance.

### 解答

We proceed as follows, making use of the fact that $Y$ and $Z$ are independent:
\[
\begin{aligned}
    \text{Cov}(Y, W) &= \mathbb{E}[YW] - \mathbb{E}[Y] \mathbb{E}[W] \\
    &= \mathbb{E}[YW] - \mathbb{E}[Y] \mathbb{E}\left[\frac{Z}{\sqrt{Y}}\right] \\
    &= \mathbb{E}\left[Y\frac{Z}{\sqrt{Y}}\right] - \mathbb{E}[Y] \mathbb{E}\left[\frac{1}{\sqrt{Y}}\right] \mathbb{E}\left[Z\right] \\
    &= \mathbb{E}[\sqrt{Y}] \mathbb{E}[Z] \\
    &= 0
\end{aligned}
\]

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0"
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "y3VGok7RKTIHCCLKu3Pi",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-7 23:31:33 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7988689,
    "source": "Wackerly",
    "status": "published",
    "tags": [
      {
        "tag": "Covariance"
      }
    ],
    "title": "Covariance Review VI",
    "topic": "statistics",
    "urlEnding": "covariance-review-vi",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "y3VGok7RKTIHCCLKu3Pi",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Covariance"
      }
    ],
    "title": "Covariance Review VI",
    "topic": "statistics",
    "urlEnding": "covariance-review-vi"
  }
}
```
