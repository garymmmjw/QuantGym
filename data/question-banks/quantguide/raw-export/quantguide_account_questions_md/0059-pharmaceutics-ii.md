# QuantGuide Question

## 59. Pharmaceutics II

**Metadata**

- ID: `xgyc9iNgkk5iVMvgWJzi`
- URL: https://www.quantguide.io/questions/pharmaceutics-ii
- Topic: statistics
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: N/A
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-26 11:04:07 America/New_York
- Last Edited By: Gabe

### 题干

A pharmaceutical company has researched a drug that they claim will enhance focus for 80$\%$ of people suffering from attention deficit disorder. After examining the drug, the FDA believes that their claims regarding the effectiveness of the drug are inflated. In an attempt to disprove the company's claim, the FDA administers the drug to 20 people with attention deficit disorder and observe X, the number for whom the drug dose induces focus. More formally, the FDA is testing the null hypothesis $H_0: p=0.8$ against the alternative hypothesis $H_a: p<0.8$. Assuming the rejection region $x \leq 12$ is used, what is power of this test when $p=0.6$?

### Hint

Recall that the power of a test is $1-\beta$, where $\beta$ is the probability that the test statistic is not in the rejection region when $H_a$ is true.

### 解答

Power is $1-\beta$, where $\beta$ is the probability that the test statistic is not in the rejection region when $H_a$ is true. In order to calculate power, we must solve for $\beta$.$$\beta = P(\textrm{failing to reject } H_0 \textrm{ when } H_a \textrm{ is true}) = P(x > 12 \mid p=0.6)$$$$=\sum_{i=13} ^{20} {20 \choose i} \times 0.6^{i} \times 0.4^{20-i} \approx 0.4159$$Thus, the power of this test is:$$1-\beta \approx 0.5841$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0.5841"
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "xgyc9iNgkk5iVMvgWJzi",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-26 11:04:07 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 428730,
    "source": "",
    "status": "published",
    "tags": [],
    "title": "Pharmaceutics II",
    "topic": "statistics",
    "urlEnding": "pharmaceutics-ii",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "xgyc9iNgkk5iVMvgWJzi",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [],
    "title": "Pharmaceutics II",
    "topic": "statistics",
    "urlEnding": "pharmaceutics-ii"
  }
}
```
