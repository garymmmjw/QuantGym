# QuantGuide Question

## 865. Make a Market II

**Metadata**

- ID: `tKPMP4qNXInITAAR4weP`
- URL: https://www.quantguide.io/questions/make-a-market-ii
- Topic: finance
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-9-11 15:49:02 America/New_York
- Last Edited By: Gabe

### 题干

Let's say you have product $A$ in which you are quoting $4 \text{ @ } 5$ and product $B$ in which you are quoting $10 \text{ @ } 12$. $X \text{ @ } Y$ means that $X$ is our bid and $Y$ is our ask. We want to make a market on the product $A - B$. What is the bid-ask spread you will quote? Give the answer in the format of $Y^2 - X^2$

### Hint

What is the difference between the bid and ask? 

### 解答

We want to quote a market on the product $A-B$. A naive answer may be to set our bid at $4 - 10 = -6$ and our ask at $5 - 12 = -7$. However, this is incorrect. To replicate $A-B$, we need to long $1$ unit of $A$ and short $1$ unit of $B$. Since we are market-makers, we will quote the bid of $A-B$ to be $\text{Bid}_A - \text{Ask}_B = 4 - 12 = -8$ since we are willing to buy $A$ at the bid of $A$ and sell $B$ at the ask of $B$. Using similar logic, we can quote our ask to be $\text{Ask}_A - \text{Bid}_B$ as we are now selling $A$ and going long $B$. This gives us an ask of $5 - 10 = -5$ and a market of $-8 \text{ @ } -5$. 

$$\\$$

Plugging in our ask and bid, we get $Y^2 - X^2 = (-5)^2 - (8)^2 = -39$. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "-39"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "tKPMP4qNXInITAAR4weP",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-11 15:49:02 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7056163,
    "source": "",
    "status": "published",
    "tags": [],
    "title": "Make a Market II",
    "topic": "finance",
    "urlEnding": "make-a-market-ii",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "tKPMP4qNXInITAAR4weP",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Make a Market II",
    "topic": "finance",
    "urlEnding": "make-a-market-ii"
  }
}
```
