# QuantGuide Question

## 378. Statistical Test Review V

**Metadata**

- ID: `Jc5bkMOE9RTMKwx50cKd`
- URL: https://www.quantguide.io/questions/statistical-test-review-v
- Topic: statistics
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: Wackerly 10.31
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Rishab wants to use a Z test to test a hypothesis involving the population mean. Which of the following conditions must be met in order for Rishab to go through with the Z test? (1) Population variance must be known, (2) sample must be a random sample of the population, (3) distribution of sample mean must be approximately normal, (4) the sample size is at least 30. Please respond with the conditions concatenated in increasing order. For example, if 1 and 3 must be met, respond with 13. 

### Hint

Think about the formula for the test statistic.

### 解答

The population variance must be known, though one could make an argument that it can be estimated accurately by the sample variance when $n \geq 30$. The sample must of course be a random sample of the population. The distribution of the sample mean must be approximately normal, which suggests $n \geq 30$ by the Central Limit Theorem. However, if it is given that the population distribution is normal, then it is not necessarily the case that $n \geq 30$ must be satisfied to proceed with the Z test. Therefore, our answer is $123$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "123"
    ],
    "companies": [],
    "difficulty": "easy",
    "id": "Jc5bkMOE9RTMKwx50cKd",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 2949540,
    "randomizable": "",
    "source": "Wackerly 10.31",
    "status": "published",
    "tags": [],
    "title": "Statistical Test Review V",
    "topic": "statistics",
    "urlEnding": "statistical-test-review-v"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "Jc5bkMOE9RTMKwx50cKd",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Statistical Test Review V",
    "topic": "statistics",
    "urlEnding": "statistical-test-review-v"
  }
}
```
