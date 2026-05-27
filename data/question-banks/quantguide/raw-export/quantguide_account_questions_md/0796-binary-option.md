# QuantGuide Question

## 796. Binary Option

**Metadata**

- ID: `5ZqdS3S2vUSEKx4PtEaJ`
- URL: https://www.quantguide.io/questions/binary-option
- Topic: finance
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Finance
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-9-30 18:22:29 America/New_York
- Last Edited By: Gabe

### 题干

Consider an underlying with $S_0 = 25$. We have the following derivatives contract: this contract pays $1$ if $S_T \ge 24$ and $-1$ otherwise. We have access to the following binary calls (a contract paying $1$ if $S_T \ge K$ and $0$ otherwise). The calls are given in the format of $(\text{Strike } K, \text{Price } C_0)$

$$\begin{align*}
(25, 0.6) \\ 
(24, 0.73) \\ 
(23, 0.88) \\ 
\end{align*}$$

Give the time-$0$ price of the derivatives contract. Bonds pay $1$ at time-$T$ and have time-$0$ price $B_0 = 0.9$.

### Hint

How can we replicate the payoff using binary calls?

### 解答

We can create a replication of this. The region where $S_T \ge 24$ is simple as it is just the binary call. We can imagine the negative region as a binary put. We know that a $P_0 + C_0 = B_0$. So, we can price the binary put as $P_0 = B_0 - C_0 = 0.9 - 0.73 = 0.17$. Since this portion of the payoff is negative, we are shorting the binary put. Combining all the values, we get:

$$V_0 = C_0 - P_0 = 0.73 - 0.17 = 0.56$$

Note: this derivatives contract almost acts like a binary call, but we may have to pay if it expires OTM. This type of contract may be useful when we are looking for a cheaper contract ($0.73$ vs. $0.56$). 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0.56"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "5ZqdS3S2vUSEKx4PtEaJ",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-30 18:22:29 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6492449,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Binary Option",
    "topic": "finance",
    "urlEnding": "binary-option",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "5ZqdS3S2vUSEKx4PtEaJ",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Binary Option",
    "topic": "finance",
    "urlEnding": "binary-option"
  }
}
```
