# QuantGuide Question

## 501. Single Double Sum

**Metadata**

- ID: `zUFSUIUTMRpYMh3U4Zxl`
- URL: https://www.quantguide.io/questions/single-double-sum
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: N/A
- Source: die book
- Tags: Conditional Probability
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-3 20:24:02 America/New_York
- Last Edited By: Gabe

### 题干

A $6-$sided die with values $1-6$ is weighed such that the probability of rolling the values $2,3,4,5,$ and $6$ are the same whether we roll this die once or if we roll the die twice and take the sum of the two outcomes. Let $p_1$ be the probability that the value $1$ is obtained on this die. $p_1$ is the solitary positive solution to the polynomial equation $$\displaystyle \sum_{k=1}^6 c_kp_1^k = 1$$ for some real constants $c_1,\dots, c_6$. Find $\displaystyle \sum_{k=1}^6 c_k$.

### Hint

Let $p_i$ be the probability of rolling $i$ on this die. We know that to get sum of $2$, we must roll $1$ twice. Therefore, we must have that $p_2 = p_1^2$.

### 解答

Let $p_i$ be the probability of rolling $i$ on this die. We know that to get sum of $2$, we must roll $1$ twice. Therefore, we must have that $p_2 = p_1^2$. Similarly, to get a sum of $3$, we must roll a $1$ and a $2$ in some order, so $p_3 = 2p_1p_2$. To get a sum of $4$, we either roll $1$ and $3$ in some order or roll $2$ consecutive $2$s. Therefore, $p_4 = 2p_1p_3 + p_2^2$. To get a sum of $5$, we must  either roll a $1$ and a $4$ OR a $2$ and a $3$ in some order. Therefore, $p_5 = 2p_1p_4 + 2p_2p_3$. Lastly, to get a sum of $6$, we must obtain either $2$ consecutive $3$s, a $2$ and a $4$ in some order, or a $1$ and a $5$ in some order. Therefore, $p_6 = p_3^2 + 2p_2p_4 + 2p_1p_5$.

$$$$

Substituting, as $p_2 = p_1^2$, $p_3 = 2p_1^3$. Continuing this pattern of substitution, $p_4 = 5p_1^4, p_5 = 14p_1^5,$ and $p_6=  42p_1^6$. We also know that $p_1 + \dots + p_6 = 1$, as this accounts for all possible outcomes. Therefore, the equation $p_1$ satisfies is $$42p_1^6 + 14p_1^5 + 5p_1^4 + 2p_1^3 + p_1^2 + p_1 = 1$$ Therefore, we have that $\displaystyle \sum_{k=1}^6 c_k = 65$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "65"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "zUFSUIUTMRpYMh3U4Zxl",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-3 20:24:02 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3999977,
    "source": "die book",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Single Double Sum",
    "topic": "probability",
    "urlEnding": "single-double-sum",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "zUFSUIUTMRpYMh3U4Zxl",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Single Double Sum",
    "topic": "probability",
    "urlEnding": "single-double-sum"
  }
}
```
