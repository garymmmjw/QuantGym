# QuantGuide Question

## 905. Cat Dog Line

**Metadata**

- ID: `mYj1Qr1jeWQS4dElDnPs`
- URL: https://www.quantguide.io/questions/cat-dog-line
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Old Mission
- Source: OMC OA
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-31 08:33:13 America/New_York
- Last Edited By: Gabe

### 题干

You're walking down an infinite street, and you notice that six out of every seven cats on a sidewalk are followed by a dog, while one out of every four dogs is followed by a cat. What proportion of animals on the sidewalk are dogs?

### Hint

Let $c$ and $d$, respectively, be the proportion of cats and dogs on the sidewalk. Note that of all the cats, $\dfrac{6}{7}$ are followed by a dog. Iterate this type of logic.

### 解答

Let $c$ and $d$, respectively, be the proportion of cats and dogs on the sidewalk. We know $c+d = 1$. Let's find $d$ in terms of $c$. Note that of all the cats, $\dfrac{6}{7}$ are followed by a dog. Then, of those dogs, $\dfrac{3}{4}$ of them are followed by another dog. Of those dogs, $\dfrac{3}{4}$ are followed by another dog, etc. Therefore, we can write $$d = \dfrac{6}{7}c + \dfrac{6}{7} \cdot \dfrac{3}{4}c + \dfrac{6}{7} \cdot \left(\dfrac{3}{4}\right)^2 c + \dots = \dfrac{6c}{7} \displaystyle \sum_{k=0}^{\infty} \left(\dfrac{3}{4}\right)^k = \dfrac{24c}{7}$$ Substituting this into our initial equation, $\dfrac{31c}{7} = 1$, so $c = \dfrac{7}{31}$. This means $d = \dfrac{24}{31}$.

$$$$

Alternatively, you can create a Markov chain representing this scenario. Namely, if state $1$ is dog and state $2$ is cat, the Markov chain is $$\begin{bmatrix} 3/4 & 1/4 \\ 6/7 & 1/7 \end{bmatrix}$$ The steady state of this Markov chain yields the same answer as above.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "24/31"
    ],
    "companies": [
      {
        "company": "Old Mission"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "mYj1Qr1jeWQS4dElDnPs",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-31 08:33:13 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7416676,
    "source": "OMC OA",
    "status": "published",
    "tags": [],
    "title": "Cat Dog Line",
    "topic": "brainteasers",
    "urlEnding": "cat-dog-line",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Old Mission"
      }
    ],
    "difficulty": "medium",
    "id": "mYj1Qr1jeWQS4dElDnPs",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Cat Dog Line",
    "topic": "brainteasers",
    "urlEnding": "cat-dog-line"
  }
}
```
