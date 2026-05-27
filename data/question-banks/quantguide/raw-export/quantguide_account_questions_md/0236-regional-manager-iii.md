# QuantGuide Question

## 236. Regional Manager III

**Metadata**

- ID: `bFmc15FFgwwLN3bSWycR`
- URL: https://www.quantguide.io/questions/regional-manager-iii
- Topic: statistics
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: N/A
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 13:13:24 America/New_York
- Last Edited By: Gabe

### 题干

The regional sales manager of a large paper corporation is attempting to detect a difference equal to one deal in the average number of deals closed per week by his employees. He runs a statistical test with the null hypothesis $H_0: \mu = 15$ against his alternative hypothesis $H_a: \mu = 16$. Assuming $\sigma^2=6$, what sample size will ensure that $\alpha=\beta=0.05$? Assume simple random sampling, variance homogeneity, and that the number of deals closed is approximately normally distributed.

### Hint

Recall that the sample size for an upper-tail $\alpha$-level test is $n=\frac{(z_\alpha + z_\beta)^2 \sigma^2}{(\mu_0 - \mu_a)^2}$. Furthermore, sample size must be a whole number.

### 解答

Recall that the sample size for an upper-tail $\alpha$-level test is $n=\frac{(z_\alpha + z_\beta)^2 \sigma^2}{(\mu_0 - \mu_a)^2}$. Because $\alpha=\beta=0.05$, then $z_{0.05} = z_\alpha = z_\beta = 1.645$. Thus: 

$$n=\frac{(z_\alpha + z_\beta)^2 \sigma^2}{(\mu_0 - \mu_a)^2} = \frac{(1.645 + 1.645)^2 \times 6}{(15 - 16)^2} \approx 64.9$$

The regional sales manager will require $n=65$ observations in order to satisfy his accuracy targets of $\alpha=\beta=0.05$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "65"
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "bFmc15FFgwwLN3bSWycR",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 13:13:24 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1870338,
    "source": "",
    "status": "published",
    "tags": [],
    "title": "Regional Manager III",
    "topic": "statistics",
    "urlEnding": "regional-manager-iii"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "bFmc15FFgwwLN3bSWycR",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [],
    "title": "Regional Manager III",
    "topic": "statistics",
    "urlEnding": "regional-manager-iii"
  }
}
```
