# QuantGuide Question

## 522. Bowl of Cherries IV

**Metadata**

- ID: `0q4GINayZg3Zpb5OQ7Q0`
- URL: https://www.quantguide.io/questions/bowl-of-cherries-iv
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: N/A
- Tags: Events, Conditional Probability
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-8-26 14:36:44 America/New_York
- Last Edited By: Gabe

### 题干

There are four red cherries and five purple cherries in bowl $A$. There are six red cherries and three purple cherries in bowl $B$. Jenny randomly transfers a cherry from bowl $A$ into bowl $B$. Then, she randomly picks a cherry from bowl $B$ to eat. What is the probability that she eats a red cherry?

### Hint

Let $A$ denote the event that the cherry that Jenny eats originates from bowl $A$. Let $R$ denote the event that the cherry Jenny eats is red. After a cherry is transferred from $A$ to $B$, there are $10$ total cherries, one of which originates bowl $A$. Therefore, $\mathbb{P}(A) = \frac{1}{10}$ and $\mathbb{P}(A^c) = \frac{9}{10}$.

### 解答

Let $A$ denote the event that the cherry that Jenny eats originates from bowl $A$. Let $R$ denote the event that the cherry Jenny eats is red. After a cherry is transferred from $A$ to $B$, there are $10$ total cherries, one of which originates bowl $A$. Therefore,
\[\begin{aligned}
\mathbb{P}(A) &= \frac{1}{10} \\
\Rightarrow \mathbb{P}(A^c) &= \frac{9}{10}.
\end{aligned}\]
We wish to find $\mathbb{P}(R)$. By applying the law of total probability, we can rewrite this value as
\[\begin{aligned}
\mathbb{P}(R) &= \mathbb{P}(R \cap A) + \mathbb{P}(R \cap A^c) \\
&= \mathbb{P}(R | A)\mathbb{P}(A) + \mathbb{P}(R | B)\mathbb{P}(B). 
\end{aligned}\]
If we are given that the cherry originates from bowl $A$, then the probability that it is red is simply $\frac{4}{9}$. Similarly, if we are given that the cherry originates from bowl $B$, then the probability that it is red is simply $\frac{6}{9} = \frac{2}{3}$. Putting it all together, we conclude
\[\begin{aligned}
\mathbb{P}(R) &= \mathbb{P}(R | A)\mathbb{P}(A) + \mathbb{P}(R | B)\mathbb{P}(B) \\
&= \frac{4}{9} \cdot \frac{1}{10} + \frac{6}{9} \cdot \frac{9}{10} \\
&= \frac{29}{45}
\end{aligned}\]

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "29/45"
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "0q4GINayZg3Zpb5OQ7Q0",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 14:36:44 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4152335,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Events"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Bowl of Cherries IV",
    "topic": "probability",
    "urlEnding": "bowl-of-cherries-iv",
    "version": 2
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "0q4GINayZg3Zpb5OQ7Q0",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Events"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Bowl of Cherries IV",
    "topic": "probability",
    "urlEnding": "bowl-of-cherries-iv"
  }
}
```
