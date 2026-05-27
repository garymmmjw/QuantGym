# QuantGuide Question

## 826. Paying Bail

**Metadata**

- ID: `Ljsg81wic3uc93PzRr6K`
- URL: https://www.quantguide.io/questions/paying-bail
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Old Mission
- Source: Kaushik - OMC Glassdoor
- Tags: Conditional Expectation, Expected Value
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-16 14:22:52 America/New_York
- Last Edited By: Gabe

### 题干

You have been arrested and need to post bail. You have a bag of $\$100$ bills of which one half are real and the other half are fake. You need to pay $\$500$ for bail. Every time you give the jail a fake bill, the funds you have given are given back to you and you need to start again. How many bills will you have to pull out of the bag on average? Assume the probability of drawing each type of bill is constant per trial.


### Hint

Can you translate the states of this problem into equations?

### 解答

This is a Markov Chain question and you can tell by the existence of states in this question (state of given $\$0$, $\$100$, $\$200$, $\$300$, $\$400$, and $\$500$). Let $E_{0}$ be the number of bills you have to give on average given the state of having given the jailor $\$0$ or starting over after giving a fake bill. Then $E_{i}$ for $i$ in $\{100, 200, 300, 400, 500\}$ be the states of having given the jailor $\$i$ (all real) in a row (again, the average number of bills needed to be given). The equations become:
$$
E_{0} = \frac{1}{2} E_{1} + \frac{1}{2} E_{0} + 1
$$
$$
E_{1} = \frac{1}{2} E_{2} + \frac{1}{2} E_{0} + 1
$$
$$
E_{2} = \frac{1}{2} E_{3} + \frac{1}{2} E_{0} + 1
$$
$$
E_{3} = \frac{1}{2} E_{4} + \frac{1}{2} E_{0} + 1
$$
$$
E_{4} = \frac{1}{2} E_{5} + \frac{1}{2} E_{0} + 1
$$
$$
E_{5} = 0
$$
When you solve for $E_{0}$ (the state of expectation we are trying to find), you get $62$ bills needing to be pulled out on average.


### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "62"
    ],
    "companies": [
      {
        "company": "Old Mission"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "Ljsg81wic3uc93PzRr6K",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-16 14:22:52 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6783578,
    "randomizable": "",
    "source": "Kaushik - OMC Glassdoor",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Paying Bail",
    "topic": "probability",
    "urlEnding": "paying-bail",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Old Mission"
      }
    ],
    "difficulty": "medium",
    "id": "Ljsg81wic3uc93PzRr6K",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Paying Bail",
    "topic": "probability",
    "urlEnding": "paying-bail"
  }
}
```
