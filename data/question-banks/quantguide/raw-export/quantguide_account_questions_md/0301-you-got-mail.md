# QuantGuide Question

## 301. You Got Mail

**Metadata**

- ID: `HcZcAvZOrvXw1lr3gJDg`
- URL: https://www.quantguide.io/questions/you-got-mail
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: MSE
- Tags: Conditional Probability
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

A letter is going to be sent to one of three mailboxes uniformly at random. These mailboxes are labelled $1-3$. If the mail ends up in mailbox $i$, then there is a $\dfrac{i}{3}$ probability that the mail is actually read. Given that you checked Mailbox $1$ and didn't read any letter, find the probability that the mail ended up in Mailbox $1$.

### Hint

The two ways you didn't read the mail is that it ended up in one of the other mailboxes or it ended up in Mailbox $1$ but you didn't notice it.

### 解答

The probability that the mail makes it to Mailbox $1$ is $\dfrac{1}{3}$. There is also a $\dfrac{2}{3}$ chance the mail isn't read given it is in Mailbox $1$ by the question. Therefore, the probability of the mail being in Mailbox $1$ and not noticing it is $
\dfrac{2}{9}$. 

$$$$

The two ways you didn't read the mail is that it ended up in one of the other mailboxes or it ended up in Mailbox $1$ but you didn't notice it. We calculated the latter already, and the former is just $\dfrac{2}{3}$, so the answer is $\dfrac{\frac{2}{9}}{\frac{2}{9} + \frac{2}{3}} = \dfrac{1}{4}$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/4"
    ],
    "companies": [],
    "difficulty": "easy",
    "id": "HcZcAvZOrvXw1lr3gJDg",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 2364904,
    "source": "MSE",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "You Got Mail",
    "topic": "probability",
    "urlEnding": "you-got-mail"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "HcZcAvZOrvXw1lr3gJDg",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "You Got Mail",
    "topic": "probability",
    "urlEnding": "you-got-mail"
  }
}
```
