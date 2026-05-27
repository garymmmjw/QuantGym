# QuantGuide Question

## 268. Shoe Manufacturing

**Metadata**

- ID: `H8MnCnbc3ywnwpHZszT9`
- URL: https://www.quantguide.io/questions/shoe-manufacturing
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

A shoe manufacturer offers rock climbing shoes in black, blue, and pink. Of the first 1000 shoes sold, 400 were black. Calculate the value of the appropriate test statistic to determine if customers have a preference for black rock climbing shoes. Assume random sampling, variance homogeneity, and that preference is approximately normally distributed.

### Hint

The formula for the Z statistic is $Z = \frac{\hat{p} - p}{\sqrt{\frac{p(1-p)}{n}}}$.

### 解答

We are testing the null hypothesis $H_0: p = \frac{1}{3}$ against the alternative hypothesis $H_a: p > \frac{1}{3}$. The sample proportion $\hat{p}$ is $\frac{400}{1000} = 0.4$ for $n=1000$. The Z statistic can be calculated as:

$$Z = \frac{\hat{p} - p}{\sqrt{\frac{p(1-p)}{n}}} = \frac{0.40 - 0.33}{\sqrt{\frac{0.33(1-0.33)}{1000}}} \approx 4.47$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "4.47"
    ],
    "difficulty": "easy",
    "id": "H8MnCnbc3ywnwpHZszT9",
    "internalDifficulty": 0,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 2076686,
    "source": "",
    "status": "published",
    "tags": [],
    "title": "Shoe Manufacturing",
    "topic": "statistics",
    "urlEnding": "shoe-manufacturing"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "H8MnCnbc3ywnwpHZszT9",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [],
    "title": "Shoe Manufacturing",
    "topic": "statistics",
    "urlEnding": "shoe-manufacturing"
  }
}
```
