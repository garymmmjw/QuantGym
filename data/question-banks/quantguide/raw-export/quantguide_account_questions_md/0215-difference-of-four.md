# QuantGuide Question

## 215. Difference of Four

**Metadata**

- ID: `JOx06onJYp9Vp6DZFLZj`
- URL: https://www.quantguide.io/questions/difference-of-four
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Conditional Probability
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 13:55:23 America/New_York
- Last Edited By: Gabe

### 题干

You roll three fair dice. What is the probability that the difference between the highest and lowest values rolled is exactly four?

### Hint

In order for the difference to be exactly four, the values must either have a maximum of 6 and a minimum of 2, or a maximum of 5 and a minimum of 1. Try to consider these two cases separately.

### 解答

In order for the difference to be exactly four, the values must either have a maximum of 6 and a minimum of 2, or a maximum of 5 and a minimum of 1. Let us consider these cases separately. For the first case, two of the numbers are 6 and 2. The third number can be 2, 3, 4, 5 or 6. Thus, the unordered outcomes are 226, 236, 246, 256, and 266. The first outcome has 3 orderings, the second has six orderings, the third has six orderings, the fourth has six orderings, and the fifth has three orderings. Each ordering has a probability $\frac{1}{216}$ of occurring, so the total probability of this case is $\frac{3+6+6+6+3}{216} = \frac{24}{216}$. For the second case, two of the numbers are 5 and 1. The third number can be 1, 2, 3, 4, or 5. Thus, the unordered outcomes are 115, 125, 135, 145, and 155. The first outcome has three orderings, the second outcome has six orderings, the third outcome has six orderings, the fourth outcome has six orderings, and the fifth outcome has three orderings. Each ordering has a probability $\frac{1}{216}$ of occurring, so the total probability of this case is $\frac{3+6+6+6+3}{216} = \frac{24}{216}$. In total, the probability of yielding a difference between the highest and lowest values of exactly four is:

$$\frac{24+24}{216}= \frac{2}{9}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2/9"
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "JOx06onJYp9Vp6DZFLZj",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 13:55:23 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1717524,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Difference of Four",
    "topic": "probability",
    "urlEnding": "difference-of-four"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "JOx06onJYp9Vp6DZFLZj",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Difference of Four",
    "topic": "probability",
    "urlEnding": "difference-of-four"
  }
}
```
