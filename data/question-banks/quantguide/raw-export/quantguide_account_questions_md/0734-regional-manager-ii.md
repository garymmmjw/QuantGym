# QuantGuide Question

## 734. Regional Manager II

**Metadata**

- ID: `HzNIAoXw98qat44cbUXl`
- URL: https://www.quantguide.io/questions/regional-manager-ii
- Topic: statistics
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: N/A
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 13:14:14 America/New_York
- Last Edited By: Gabe

### 题干

The regional sales manager of a large paper corporation is attempting to detect a difference equal to one deal in the average number of deals closed per week by his employees. To check this, he records the number of deals that $36$ random salespeople make on a random week. He finds the variance of the number of deals that the $36$ random salespeople made to be 9. He runs a statistical test with $\alpha=0.05$ to test the null hypothesis $H_0: \mu = 15$ against his alternative hypothesis $H_a: \mu = 16$. What is the probability of a Type II error? Assume simple random sampling, variance homogeneity, and that the number of deals closed is approximately normally distributed.

### Hint

Use the rejection region to find the value at which the null hypothesis would be rejected. Then, utilize this value to find the $P(\textrm{fail to reject } H_0 \textrm{ when } H_a  \textrm{ is true})$ .

### 解答

We are given that $\mu=15, \bar{y}=17, s^2=9, n=36$, and $\alpha=0.05$. Because $n$ is sufficiently large, he can utilize the Z statistic. The rejection region is: 

$$z = \frac{\bar{x} - \mu}{\frac{\sigma}{\sqrt{n}}} = \frac{\bar{x} - 15}{3/\sqrt{36}} > 1.645 \Rightarrow \bar{x} > 15.82$$

The probability of a Type II error, also known as $\beta$, is: $$P(\bar{x} \leq 15.82 \mid H_0 =16) = P(z \leq \frac{15.82-16}{3/\sqrt{36}}) = P(z \leq -0.36) \approx 0.3594$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0.3594"
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "HzNIAoXw98qat44cbUXl",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 13:14:14 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6008250,
    "source": "",
    "status": "published",
    "tags": [],
    "title": "Regional Manager II",
    "topic": "statistics",
    "urlEnding": "regional-manager-ii"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "HzNIAoXw98qat44cbUXl",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [],
    "title": "Regional Manager II",
    "topic": "statistics",
    "urlEnding": "regional-manager-ii"
  }
}
```
