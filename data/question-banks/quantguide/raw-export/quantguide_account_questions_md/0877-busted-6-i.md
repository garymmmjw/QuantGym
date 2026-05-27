# QuantGuide Question

## 877. Busted 6 I

**Metadata**

- ID: `2fTltDOczDQPr9BtoBKq`
- URL: https://www.quantguide.io/questions/busted-6-i
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: jsceo
- Tags: Conditional Expectation
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-7 12:29:06 America/New_York
- Last Edited By: Gabe

### 题干

Suppose you play a game where you continually roll a die until you obtain either a $5$ or a $6$. If you receive a $5$, then you cash out the sum of all of your previous rolls (excluding the $5$). If you receive a $6$, then you receive no payout. You do not have the decision to cash out mid-game. What is your expected payout?

### Hint

Given that we receive either a $5$ or a $6$, we roll $5$ and $6$ with equal probability $1/2$. In the case we roll a $6$, our payout is $0$. In the case it is a $5$, you cash out the sum of the previous rolls. If $P$ is your payout, then $$\mathbb{E}[P] = \mathbb{E}[P \mid 6]\mathbb{P}[6] + \mathbb{E}[P \mid 5]\mathbb{P}[5]$$ where $5$ and $6$ represent the events of rolling a $5$ and $6$ first, respectively.

### 解答

Given that we receive either a $5$ or a $6$, we roll $5$ and $6$ with equal probability $1/2$. In the case we roll a $6$, our payout is $0$. In the case it is a $5$, you cash out the sum of the previous rolls. If $P$ is your payout, then $$\mathbb{E}[P] = \mathbb{E}[P \mid 6]\mathbb{P}[6] + \mathbb{E}[P \mid 5]\mathbb{P}[5]$$ where $5$ and $6$ represent the events of rolling a $5$ and $6$ first, respectively. The first term vanishes, as the conditional expectation is $0$. Therefore, $\mathbb{E}[P] = \dfrac{1}{2} \cdot \mathbb{E}[P \mid 5]$. On average, it takes $3$ turns for the $5$ to appear, since we are in the set with probability $1/3$ per trial. This means that there are $2$ roll on average before the $5$. The expected payout of each of those rolls is $2.5$, as we must have values $1-4$ in each of those first $2$ trials. Furthermore, the outcomes are equally likely, so we have that $\mathbb{E}[P \mid 5] = 2 \cdot 2.5 = 5$. Therefore, $$\mathbb{E}[P] = \dfrac{1}{2} \cdot 5 = \dfrac{5}{2}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "5/2"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "2fTltDOczDQPr9BtoBKq",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 12:29:06 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7178844,
    "randomizable": "",
    "source": "jsceo",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Busted 6 I",
    "topic": "probability",
    "urlEnding": "busted-6-i",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "2fTltDOczDQPr9BtoBKq",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Busted 6 I",
    "topic": "probability",
    "urlEnding": "busted-6-i"
  }
}
```
