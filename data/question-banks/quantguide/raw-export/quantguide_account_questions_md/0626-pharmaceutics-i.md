# QuantGuide Question

## 626. Pharmaceutics I

**Metadata**

- ID: `W0lCyJ3LGhCOIXYFNAwN`
- URL: https://www.quantguide.io/questions/pharmaceutics-i
- Topic: statistics
- Difficulty: easy
- Internal Difficulty: N/A
- Companies: N/A
- Source: N/A
- Tags: N/A
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

A pharmaceutical company has researched a drug that they claim will enhance focus for 80$\%$ of people suffering from attention deficit disorder. After examining the drug, the FDA believes that their claims regarding the effectiveness of the drug are inflated. In an attempt to disprove the company's claim, the FDA administers the drug to 20 people with attention deficit disorder and observe X, the number for whom the drug dose induces focus. More formally, the FDA is testing the null hypothesis $H_0: p=0.8$ against the alternative hypothesis $H_a: p<0.8$. Assuming the rejection region $x \leq 12$ is used, what is $\alpha$, the level of significance?

### Hint

Recall that the level of significance, $\alpha$, is also $P(\textrm{rejecting } H_0 \textrm{ when } H_0 \textrm{ is true})$.

### 解答

The level of significance is also the probability that the test statistic is in the rejection region given the null hypothesis is true. $$\alpha = P(\textrm{rejecting } H_0 \textrm{ when } H_0 \textrm{ is true}) = P(x \leq 12 \mid p=0.8)$$$$=\sum_{i=0} ^{12} {20 \choose i} \times 0.8^{i} \times 0.2^{12-i} \approx 0.032$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0.032"
    ],
    "difficulty": "easy",
    "id": "W0lCyJ3LGhCOIXYFNAwN",
    "internalDifficulty": 0,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 4955725,
    "source": "",
    "status": "published",
    "tags": [],
    "title": "Pharmaceutics I",
    "topic": "statistics",
    "urlEnding": "pharmaceutics-i"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "W0lCyJ3LGhCOIXYFNAwN",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [],
    "title": "Pharmaceutics I",
    "topic": "statistics",
    "urlEnding": "pharmaceutics-i"
  }
}
```
