# QuantGuide Question

## 585. Price an Option II

**Metadata**

- ID: `pILYKHepDOkAqqsXqH1K`
- URL: https://www.quantguide.io/questions/price-an-option-ii
- Topic: finance
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Finance
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-9-11 15:48:34 America/New_York
- Last Edited By: Gabe

### 题干

You have access to the European call options at the following strikes and $T_0$ prices, the underlying $S$ which has initial price $S_0 = 7$, and a bond that has initial price $0.9$, paying $1$ at time $T$. The calls are given in the format of $(\text{Strike } K, \text{Price } C_0)$

$$\begin{align*}
(5, 4.2) \\ 
(10, 1.4) \\ 
(15, 0.7) \\ 
(20, 0.1)
\end{align*}$$

Find the time-$0$ price of a contract that pays $\max({3S_T, 15})$ at time $T$. 


### Hint

Create a replicating portfolio

### 解答

To find the time-$0$ price, we need to create a replicating portfolio. We can see that the payoff $\max(3S_T, 15)$ is the same as $15 + 3\max(S_T - 5,0)$. This replicating portfolio is the same as being long $3$ call-options with strike $K=5$, but now shifted vertically by $15$. Constants can be treated as $n$ units of a bond, paying $1$ at maturity. So, to replicate the final payoff, we have $15$ bonds and $3$ call options. 

$$\\$$

So, we have time-$0$ price of $V_0 = 15(0.9) + 3(4.2) = 26.1$. Note: we need to discount the bonds back to the present value of $0.9$. 



### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "26.1"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "pILYKHepDOkAqqsXqH1K",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-11 15:48:34 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4700292,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Price an Option II",
    "topic": "finance",
    "urlEnding": "price-an-option-ii",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "pILYKHepDOkAqqsXqH1K",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Price an Option II",
    "topic": "finance",
    "urlEnding": "price-an-option-ii"
  }
}
```
