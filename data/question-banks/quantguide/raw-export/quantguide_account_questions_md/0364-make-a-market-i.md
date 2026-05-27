# QuantGuide Question

## 364. Make a Market I 

**Metadata**

- ID: `uEOszLeBAlJT8SnmC7VC`
- URL: https://www.quantguide.io/questions/make-a-market-i-
- Topic: finance
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: N/A
- Tags: N/A
- Premium: True
- Solution Free: False
- Version: 6
- Last Edited: 2023-9-30 23:13:16 America/New_York
- Last Edited By: Gabe

### 题干

Let's say you have product $A$ in which you are quoting $4 \text{ @ } 5$ and product $B$ in which you are quoting $10 \text{ @ } 12$. $X \text{ @ } Y$ means that $X$ is our bid and $Y$ is our ask. We want to make a market on the product $A + B$. What is the bid-ask spread you will quote? Give the answer in the format of $Y^2 - X^2$

### Hint

How can you replicate the product $A+B$ from the products $A$ and $B$? How can you price it? 

### 解答

We want no arbitrage pricing, so our pricing should be the same as a replicated portfolio. In other words, the price of $\text{Price}_{A+B} = \text{Price}_A + \text{Price}_B$. There are two perspectives we can take: a market-maker and a market-taking perspective. The market-maker perspective is more important in the context of trading interviews, so we will focus on this.

$\\$

When we consider $A + B$, we are considering a long position of $A$ and a long position of $B$. So, if we want to set our bid (and not be taken out by other market-makers), we should set our bid to be the $\text{Bid}_A + \text{Bid}_B$ and ask to be $\text{Ask}_A + \text{Ask}_B$. This gives us an ask of $17$ and a bid of $14$ and so $Y^2 - X^2 = 17^2 - 14^2 = 93$. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "93"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "uEOszLeBAlJT8SnmC7VC",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-30 23:13:16 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2798402,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [],
    "title": "Make a Market I ",
    "topic": "finance",
    "urlEnding": "make-a-market-i-",
    "version": 6
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "uEOszLeBAlJT8SnmC7VC",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [],
    "title": "Make a Market I ",
    "topic": "finance",
    "urlEnding": "make-a-market-i-"
  }
}
```
