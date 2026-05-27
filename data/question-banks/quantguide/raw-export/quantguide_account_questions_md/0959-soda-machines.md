# QuantGuide Question

## 959. Soda Machines

**Metadata**

- ID: `BeU5UBO3Og79bQs3ZiZL`
- URL: https://www.quantguide.io/questions/soda-machines
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

A soda machine is designed to release not more than 7 ounces of soda per cup, on average. To test this machine, you fill 8 cups of soda and measure their volumes. The mean and standard deviation of the 8 measurements were 7.1 ounces and 0.12 ounce, respectively. What is value of the appropriate test statistic to validate the machine's claim? Assume random sampling, variance homogeneity, and that dispensing volume is approximately normally distributed.

### Hint

Since the sample size is less than 30, you should use a $t$ test over a $z$ test. Should you use a one-sided or two-sided test?

### 解答

Since the sample size is less than 30, we utilize a $t$ test where $H_0: \mu = 7$ and $H_a: \mu \neq 7$. The t statistic is:

$$t = \frac{\bar{x} - \mu}{\sqrt{\frac{s^2}{n}}} = \frac{7.1 - 7}{\sqrt{0.12^2/8}} \approx 2.36$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "5/6 * (8^0.5)",
      "2.36"
    ],
    "difficulty": "easy",
    "id": "BeU5UBO3Og79bQs3ZiZL",
    "internalDifficulty": 0,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 7814767,
    "source": "",
    "status": "published",
    "tags": [],
    "title": "Soda Machines",
    "topic": "statistics",
    "urlEnding": "soda-machines"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "BeU5UBO3Og79bQs3ZiZL",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [],
    "title": "Soda Machines",
    "topic": "statistics",
    "urlEnding": "soda-machines"
  }
}
```
