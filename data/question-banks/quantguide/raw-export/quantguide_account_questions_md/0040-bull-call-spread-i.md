# QuantGuide Question

## 40. Bull Call Spread I

**Metadata**

- ID: `eMIkaDFFOheM89Stma98`
- URL: https://www.quantguide.io/questions/bull-call-spread-i
- Topic: finance
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: N/A
- Tags: Finance
- Premium: True
- Solution Free: False
- Version: 3
- Last Edited: 2023-9-30 23:13:08 America/New_York
- Last Edited By: Gabe

### 题干

Consider the following asset $S$, with initial price $S_0 = 7$. In this bull call spread, you will long a call at strike $K = 5$ and short a call at strike $K = 10$. What is the maximum and minimum $\textit{payoff}$ of this contract? 

$$\\$$

Give the result in the form: $\max^2 + \min^2$


### Hint

Draw a payoff diagram for the bull call spread

### 解答

If we look at the payoff diagram of a bull call spread, we have $V_T = 0, S_T \in [0,5]$, $V_T = S_T - 5, S_T \in [5,10]$ and $V_T = 10, S_T \in [5, \infty)$.

So, in the worst case, we will gain $0$ and in the best case, we will gain $5$. In general, a bull call spread can cap the upside, but can also limit the downside loss. This option contract is the best when an investor expects a moderate increase in the stock (i.e it stays in the range of $K_1$ and $K_2$). 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "25"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "eMIkaDFFOheM89Stma98",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-30 23:13:08 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1779268,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Bull Call Spread I",
    "topic": "finance",
    "urlEnding": "bull-call-spread-i",
    "version": 3
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "o6DDgc1g4HF4fVBrJm6w",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Bull Call Spread I",
    "topic": "finance",
    "urlEnding": "bull-call-spread-i"
  }
}
```
