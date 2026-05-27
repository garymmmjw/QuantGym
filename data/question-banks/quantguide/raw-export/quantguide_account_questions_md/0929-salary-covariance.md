# QuantGuide Question

## 929. Salary Covariance

**Metadata**

- ID: `JQ36hkfSi2TyBy9TVYGT`
- URL: https://www.quantguide.io/questions/salary-covariance
- Topic: statistics
- Difficulty: easy
- Internal Difficulty: N/A
- Companies: N/A
- Source: N/A
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

In a population of male-female couples, male annual earnings, denoted $M$, have a mean of $\$$60k per year and a standard deviation of $\$$13k. Female annual earnings, denoted $F$, have a mean of $\$$55k per year and a standard deviation of $\$$11k. The correlation between male and female annual earnings is 0.85. What is the covariance between male and female annual earnings (in thousands of dollars squared)?

### Hint

Use the formula for correlation $\rho_{xy} = \frac{\sigma_{xy}}{\sigma_x \sigma_y}$ to solve for covariance.

### 解答

We know that $\rho_{xy} = \frac{\sigma_{xy}}{\sigma_x \sigma_y}$. Solving for $\sigma_{xy}$, we find that the covariance between male and female annual earnings is:

$$\sigma_{xy} = \rho_{xy} \sigma_x \sigma_y = 0.85 \times 13 \times 11 = 121.55$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "121.55"
    ],
    "difficulty": "easy",
    "id": "JQ36hkfSi2TyBy9TVYGT",
    "internalDifficulty": 0,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 7599973,
    "source": "",
    "status": "published",
    "tags": [],
    "title": "Salary Covariance",
    "topic": "statistics",
    "urlEnding": "salary-covariance"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "JQ36hkfSi2TyBy9TVYGT",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Salary Covariance",
    "topic": "statistics",
    "urlEnding": "salary-covariance"
  }
}
```
