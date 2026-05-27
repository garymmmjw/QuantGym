# QuantGuide Question

## 889. Die Rank

**Metadata**

- ID: `aV8qBm27Cw5KKmSjSBPI`
- URL: https://www.quantguide.io/questions/die-rank
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Jane Street
- Source: js
- Tags: Discrete Random Variables, Expected Value
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-12 17:02:51 America/New_York
- Last Edited By: Gabe

### 题干

Let $X_1,\dots,X_5$ be the upfaces of $5$ independent rolls of a fair $6-$sided die with values $1-6$ on each side. Rank each of the following from largest to smallest in terms of value: a) $\mathbb{E}[X_1X_2]$; b) $\mathbb{E}[X_1^2]$; c) $\mathbb{E}[X_{(3)}^2]$, where $X_{(3)}$ is the median of the $5$ die rolls. 

$$$$

Let $a = 1, b = 2,$ and $c = 3$. Answer with the integer corresponding to the concatenation of the order from largest to smallest. For example, if you believe $c > b > a$, answer with $321$.



### Hint

Compute the first two values explicitly and then think about the distribution of the values of the median.

### 解答

We can calculate $\mathbb{E}[X_1X_2] = \mathbb{E}[X_1]\mathbb{E}[X_2] = (3.5)^2 = 12.25$ by direct calculation via independence of the rolls. Furthermore, we can calculate $\mathbb{E}[X_1^2] = \dfrac{1^2 + 2^2 + 3^2 + 4^2 + 5^2 + 6^2}{6} \approx 15.17$, so we know that $b > a$. We now need to find where $c$ lies relative to these. It's worth just thinking about this intuitively, as the calculations are quite difficult.

$$$$

By inspection, we note that the distribution here is skewed towards the middle (we would need $3$ $6$s or $3$ $1$s to get either extreme). Note that in the sum for $\mathbb{E}[X_1^2]$, we gain much more through the squared $6$ than we lose in the squared $1$. This ranks it below $\mathbb{E}[X_1^2]$. 

$$$$

To compare to $\mathbb{E}[X_1X_2]$, we note if either one of the dice is low, it reduces our product greatly. This reduction occurs with very high probability, whereas the median is more likely to reach at least a moderate value (say $3$ or $4$), so the median is skewed more right. Therefore, we get that $b > c > a$, corresponding to the answer $231$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "231"
    ],
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "aV8qBm27Cw5KKmSjSBPI",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-12 17:02:51 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7305840,
    "source": "js",
    "status": "published",
    "tags": [
      {
        "tag": "Discrete Random Variables"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Die Rank",
    "topic": "probability",
    "urlEnding": "die-rank",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "medium",
    "id": "aV8qBm27Cw5KKmSjSBPI",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Discrete Random Variables"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Die Rank",
    "topic": "probability",
    "urlEnding": "die-rank"
  }
}
```
