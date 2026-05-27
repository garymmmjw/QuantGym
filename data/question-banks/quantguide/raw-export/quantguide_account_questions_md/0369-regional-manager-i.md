# QuantGuide Question

## 369. Regional Manager I

**Metadata**

- ID: `iyadj8kuXWzlLvRMkztn`
- URL: https://www.quantguide.io/questions/regional-manager-i
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

The regional sales manager of a large paper corporation claims that his salespeople are averaging no more than 15 deals per week, which is subpar compared to the neighboring regions. To check this, he records the number of deals that $36$ random salespeople make on a random week. He finds the mean and variance of the number of deals that the $36$ random salespeople made to be 17 and 9, respectively. With these values, he runs a statistical test to see if his employees are making significantly more deals than 15. What is the value of the appropriate test statistic he used? Assume simple random sampling, variance homogeneity, and that the number of deals closed is approximately normally distributed.

### Hint

Because $n$ is sufficiently large, he can utilize the Z statistic.

### 解答

He is testing the null hypothesis $H_0: \mu = 15$ against the alternative hypothesis $H_a: \mu > 15$. Because $n$ is sufficiently large, he can utilize the Z statistic. We are given that $\mu=15, \bar{y}=17, s^2=9, and n=36$ which can be used in the z-score formula:$$z = \frac{\bar{y} - \mu}{\frac{s}{\sqrt{n}}} = \frac{17 - 15}{\frac{3}{\sqrt{36}}} = 4$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "4"
    ],
    "difficulty": "easy",
    "id": "iyadj8kuXWzlLvRMkztn",
    "internalDifficulty": 0,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 2865545,
    "source": "",
    "status": "published",
    "tags": [],
    "title": "Regional Manager I",
    "topic": "statistics",
    "urlEnding": "regional-manager-i"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "iyadj8kuXWzlLvRMkztn",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [],
    "title": "Regional Manager I",
    "topic": "statistics",
    "urlEnding": "regional-manager-i"
  }
}
```
