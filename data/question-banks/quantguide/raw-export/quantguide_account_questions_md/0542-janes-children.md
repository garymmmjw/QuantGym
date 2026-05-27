# QuantGuide Question

## 542. Jane's Children

**Metadata**

- ID: `6o1Whx1fd8aOhJNMQ9uY`
- URL: https://www.quantguide.io/questions/janes-children
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Jane Street, Goldman Sachs, SIG, DE Shaw, IMC
- Source: N/A
- Tags: Conditional Probability
- Premium: True
- Solution Free: False
- Version: 4
- Last Edited: 2023-11-7 13:11:59 America/New_York
- Last Edited By: Gabe

### 题干

There is a conference for parents with at least one daughter. Jane, a mother with two children, is invited. What is the probability that Jane has two daughters?

### Hint

What is the sample space conditioned on the information you were given about Jane's children?

### 解答

The sample space of two children given at least one child is a daughter is $\Omega = \{ (b,g), (g,b), (g,g)\}$, where $(b,g)$ means that the older child is a boy and the younger child is a girl. Thus, the probability that Jane has two daughters is $\frac{1}{3}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/3"
    ],
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "Goldman Sachs"
      },
      {
        "company": "SIG"
      },
      {
        "company": "DE Shaw"
      },
      {
        "company": "IMC"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "6o1Whx1fd8aOhJNMQ9uY",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 13:11:59 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4338805,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Jane's Children",
    "topic": "probability",
    "urlEnding": "janes-children",
    "version": 4
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "Goldman Sachs"
      },
      {
        "company": "SIG"
      },
      {
        "company": "DE Shaw"
      },
      {
        "company": "IMC"
      }
    ],
    "difficulty": "easy",
    "id": "6o1Whx1fd8aOhJNMQ9uY",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Jane's Children",
    "topic": "probability",
    "urlEnding": "janes-children"
  }
}
```
