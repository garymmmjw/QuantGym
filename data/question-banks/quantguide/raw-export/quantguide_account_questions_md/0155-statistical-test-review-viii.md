# QuantGuide Question

## 155. Statistical Test Review VIII

**Metadata**

- ID: `LifclbP3SfpbFqKrvI8M`
- URL: https://www.quantguide.io/questions/statistical-test-review-viii
- Topic: statistics
- Difficulty: easy
- Internal Difficulty: 1
- Companies: DRW
- Source: DRW OA
- Tags: N/A
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-2 09:48:45 America/New_York
- Last Edited By: Gabe

### 题干

Consider a random sample of size $25$ from the distribution $\mathcal{N}(160, 900)$. To the nearest ten thousandth, what is the probability that the sample mean is $165$ or greater?

### Hint

Consider a random sample of size $25$ from the distribution $\mathcal{N}(160, 900)$. To the nearest ten thousandth, what is the probability that the sample mean is $165$ or greater?

### 解答

Let $\hat{\mu}$ denote the sample mean. Our test statistic is defined as follows:
\[
\begin{aligned}
    z &= \frac{\hat{\mu} - \mu}{\sigma / \sqrt{n}} \\ 
    &= \frac{\sqrt{25}(165 - 160)}{30} \\
    &= \frac{5}{6}
\end{aligned}
\]
The desired probability is simply $\mathbb{P}\left(Z \geq \frac{5}{6}\right) = 1 - \mathbb{P}\left(Z \leq \frac{5}{6}\right)$ for $Z \sim \mathcal{N}(0, 1)$. With a calculator, we find this value to be $0.2023$. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0.2023"
    ],
    "companies": [
      {
        "company": "DRW"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "LifclbP3SfpbFqKrvI8M",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-2 09:48:45 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1154027,
    "source": "DRW OA",
    "status": "published",
    "tags": [],
    "title": "Statistical Test Review VIII",
    "topic": "statistics",
    "urlEnding": "statistical-test-review-viii",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "DRW"
      }
    ],
    "difficulty": "easy",
    "id": "LifclbP3SfpbFqKrvI8M",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [],
    "title": "Statistical Test Review VIII",
    "topic": "statistics",
    "urlEnding": "statistical-test-review-viii"
  }
}
```
