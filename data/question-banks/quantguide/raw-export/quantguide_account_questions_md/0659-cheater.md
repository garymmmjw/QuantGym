# QuantGuide Question

## 659. Cheater

**Metadata**

- ID: `mu2pV4X3HZKFzJmGPP0P`
- URL: https://www.quantguide.io/questions/cheater
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: SIG, Optiver
- Source: original
- Tags: Conditional Probability
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-14 23:52:30 America/New_York
- Last Edited By: Gabe

### 题干

As a good test taker, on a multiple choice exam with $5$ options per question, Gabe either knows the answer to a question beforehand or chooses an answer completely at random. If he knows the answer beforehand, he selects the correct answer. If the probability that Gabe knows the answer to any given question is $0.6$, find the probability that an answer that was correct was one for which he knew the answer.

### Hint

Let $K$ be the event that Gabe knew the answer to the question, $C$ be the event he gets a question right, and $G$ be the event he guessed on a question.

### 解答

Let $K$ be the event that Gabe knew the answer to the question, $C$ be the event he gets a question right, and $G$ be the event he guessed on a question. We know that $\mathbb{P}[K] = 0.6$, $\mathbb{P}[G] = \mathbb{P}[K^c] = 1 - \mathbb{P}[K] = 0.4$, $\mathbb{P}[C \mid G] = 0.2$, as he selects completely at random, and it is reasonable to assume that $\mathbb{P}[C \mid K] = 1$, as if he knows the answer, he will get it correct. We want to find $\mathbb{P}[K \mid C]$. By definition of conditional probability, this is $\mathbb{P}[K \mid C] = \dfrac{\mathbb{P}[KC]}{\mathbb{P}[C]}$. On the top, we apply conditional probability again to write this as $$\mathbb{P}[KC] = \mathbb{P}[C \mid K]\mathbb{P}[K]$$ and on the bottom, we apply the Law of Total Probability to get $$\mathbb{P}[C] = \mathbb{P}[C \mid K]\mathbb{P}[K] + \mathbb{P}[C \mid G]\mathbb{P}[G]$$  Thus, we know that $\mathbb{P}[K \mid C] = \dfrac{\mathbb{P}[C \mid K]\mathbb{P}[K]}{\mathbb{P}[C \mid K]\mathbb{P}[K] + \mathbb{P}[C \mid G]\mathbb{P}[G]} = \dfrac{1 \cdot 0.6}{1 \cdot 0.6 + 0.2 \cdot 0.4} = \dfrac{15}{17}$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "15/17"
    ],
    "companies": [
      {
        "company": "SIG"
      },
      {
        "company": "Optiver"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "mu2pV4X3HZKFzJmGPP0P",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-14 23:52:30 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5302689,
    "source": "original",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Cheater",
    "topic": "probability",
    "urlEnding": "cheater",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      },
      {
        "company": "Optiver"
      }
    ],
    "difficulty": "easy",
    "id": "mu2pV4X3HZKFzJmGPP0P",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Cheater",
    "topic": "probability",
    "urlEnding": "cheater"
  }
}
```
