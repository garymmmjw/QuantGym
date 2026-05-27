# QuantGuide Question

## 338. Marble Mischief

**Metadata**

- ID: `3afY96zJG5kUqYmXF0pD`
- URL: https://www.quantguide.io/questions/marble-mischief
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Chicago Trading Company
- Source: greenbook
- Tags: Conditional Probability
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-16 18:13:32 America/New_York
- Last Edited By: Gabe

### 题干

Sean has $200$ red, $400$ blue, and $600$ green marbles in an urn. He draws out the marbles one-at-a-time without replacement. Find the probability that there is at least $1$ blue and $1$ green marble left in the urn right after the last red marble is selected.

### Hint

Let $B$ and $G$ represent the event that the absolute last marble in our $1200-$long sequence is blue or green, respectively. Let $R$ be the event in question. By Law of Total Probability, $$\mathbb{P}[R] = \mathbb{P}[R \mid G]\mathbb{P}[G] + \mathbb{P}[R \mid B]\mathbb{P}[B]$$

### 解答

Let $B$ and $G$ represent the event that the absolute last marble in our $1200-$long sequence is blue or green, respectively. Let $R$ be the event in question. By Law of Total Probability, $$\mathbb{P}[R] = \mathbb{P}[R \mid G]\mathbb{P}[G] + \mathbb{P}[R \mid B]\mathbb{P}[B]$$ $\mathbb{P}[G] = \dfrac{1}{2}$ and $\mathbb{P}[B] = \dfrac{1}{3}$ by the exchangeability of the draws. Then, for the event to occur conditioned on green being the absolute last marble in the first case, we need blue to be the last among red and blue marbles. This would occur with probability $\dfrac{400}{600} = \dfrac{2}{3}$, as there are $600$ marbles of those colors and $400$ are blue. 

$$$$

Similarly, among red and green, the probability the last is green is $\dfrac{600}{800} = \dfrac{3}{4}$. Therefore, $$\mathbb{P}[R] = \dfrac{2}{3} \cdot \dfrac{1}{2} + \dfrac{3}{4} \cdot \dfrac{1}{3} = \dfrac{7}{12}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "7/12"
    ],
    "companies": [
      {
        "company": "Chicago Trading Company"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "3afY96zJG5kUqYmXF0pD",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-16 18:13:32 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2590844,
    "source": "greenbook",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Marble Mischief",
    "topic": "probability",
    "urlEnding": "marble-mischief",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Chicago Trading Company"
      }
    ],
    "difficulty": "medium",
    "id": "3afY96zJG5kUqYmXF0pD",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Marble Mischief",
    "topic": "probability",
    "urlEnding": "marble-mischief"
  }
}
```
