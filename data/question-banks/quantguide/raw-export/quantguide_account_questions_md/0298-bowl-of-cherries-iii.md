# QuantGuide Question

## 298. Bowl of Cherries III

**Metadata**

- ID: `7oEOgunsbECIXkvt5K7f`
- URL: https://www.quantguide.io/questions/bowl-of-cherries-iii
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Conditional Probability, Events
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2024-1-6 14:09:34 America/New_York
- Last Edited By: Kaushik

### 题干

Amy has 100 red cherries and 300 purple cherries in bowl $A$. She has 300 red cherries and 100 purple cherries in bowl $B$. She randomly transfers half of the cherries in bowl $A$ into bowl $B$. What is the probability that a randomly picked cherry from bowl $B$ is red? 

### Hint

Suppose the cherry transfer has already occurred and consider the Law of Total Probability.

### 解答

We suppose the cherry transfer has already happened. Let $R$ denote the event that the randomly picked cherry from bowl $B$ is red. Let $A$ denote the event that the randomly picked cherry originated from bowl $A$. Then, $A^c$ denotes the event that the randomly picked cherry originated from bowl $B$. $$$$

We are given the following from the problem statement:
\[\begin{aligned}
\mathbb{P}(G | A) &= \frac{1}{4} \\
\mathbb{P}(G | A^c) &= \frac{3}{4} \\
\mathbb{P}(A) &= \frac{1}{3} \\
\mathbb{P}(A^c) &= \frac{2}{3} 
\end{aligned}\]
By the Law of Total Probability (since $A, A^c$ together form a partition of $\Omega$),
\[\begin{aligned}
    \mathbb{P}(G) &= \mathbb{P}(G \cap A) + \mathbb{P}(G \cap A^c) \\
    &= \mathbb{P}(G | A) \mathbb{P}(A) + \mathbb{P}(G | A^c) \mathbb{P}(A^c) \\
    &= \frac{1}{4} \cdot \frac{1}{3} + \frac{3}{4} \frac{2}{3} \\
    &= \frac{7}{12} 
\end{aligned}\]

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "7/12"
    ],
    "difficulty": "medium",
    "hasEdits": true,
    "id": "7oEOgunsbECIXkvt5K7f",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2024-1-6 14:09:34 America/New_York",
    "lastEditedBy": "Kaushik",
    "orderId": 2342157,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Events"
      }
    ],
    "title": "Bowl of Cherries III",
    "topic": "probability",
    "urlEnding": "bowl-of-cherries-iii",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "7oEOgunsbECIXkvt5K7f",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Events"
      }
    ],
    "title": "Bowl of Cherries III",
    "topic": "probability",
    "urlEnding": "bowl-of-cherries-iii"
  }
}
```
