# QuantGuide Question

## 558. Call Option Change

**Metadata**

- ID: `fkRMAFhhzMQoVmGMbuhD`
- URL: https://www.quantguide.io/questions/call-option-change
- Topic: finance
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Finance
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-10-8 11:59:33 America/Chicago
- Last Edited By: Sean

### 题干

You bought an at-the-money call option with initial price $C_0 = 2.3$ for an underlying $S$, which has initial price $S_0 = 13$. The gamma of this call is $\Gamma = 0.03$. If the underlying $S$ moves up by $\$2$, give an approximation for the new value of the call option.

### Hint

What is the delta of an at-the-money call option? 

### 解答

An at-the-money call option has $\Delta = 0.5$. We know that $\Gamma$ is the sensitivity of $\Delta$ to the price change of the underlying. If the underlying moves by $\$1$, then we would expect the call option to increase by $0.5$. However, now, the delta has also increased by gamma ($\Delta = 0.5 + 0.03 = 0.53$). In other words, $\Delta = 0.53$. When the underlying moves another dollar up, then we need to increase the call option by this new delta. This leaves the following approximation of the new price of the option. 

$$C = 2.3 + 0.5 + 0.53 = 3.33$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "3.33"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": true,
    "id": "fkRMAFhhzMQoVmGMbuhD",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-8 11:59:33 America/Chicago",
    "lastEditedBy": "Sean",
    "orderId": 4469169,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Call Option Change",
    "topic": "finance",
    "urlEnding": "call-option-change",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "fkRMAFhhzMQoVmGMbuhD",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Call Option Change",
    "topic": "finance",
    "urlEnding": "call-option-change"
  }
}
```
