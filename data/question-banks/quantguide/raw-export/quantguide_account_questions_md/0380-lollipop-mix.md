# QuantGuide Question

## 380. Lollipop Mix

**Metadata**

- ID: `vHh9KQE1kY9IG6pTAQEE`
- URL: https://www.quantguide.io/questions/lollipop-mix
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: MAO edited
- Tags: Combinatorics, Conditional Probability
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

How many distinguishable permutations of LOLLIPOP are there that start and end with the same letter?

### Hint

LOLLIPOP consists of $3$ L, $2$ O, $2$ P, and $1$ I. There are a total of $\dfrac{8!}{3!3!2!} = 560$ total distinguishable permutations of LOLLIPOP. Find the probability that a random permutation starts and ends with the same letter by conditional probability.

### 解答

LOLLIPOP consists of $3$ L, $2$ O, $2$ P, and $1$ I. There are a total of $\dfrac{8!}{3!2!2!} = 1680$ total distinguishable permutations of LOLLIPOP. We find the probability that a random permutation starts and ends with the same letter. Let this event be $S$. 

$$$$

We condition on the first letter of our permutation. Namely, $\mathbb{P}[S] = \mathbb{P}[S \mid L]\mathbb{P}[L] + \mathbb{P}[S \mid O]\mathbb{P}[O] + \mathbb{P}[S \mid P]\mathbb{P}[P] + \mathbb{P}[S \mid I]\mathbb{P}[I]$. The last term is $0$, as if we start with $I$, we can't end with $I$, as there is only one $I$ total. The middle two terms are the same, as there are $2$ of each letter in LOLLIPOP. We do the calculations for just $O$. Namely, $\mathbb{P}[O] = \dfrac{2}{8}$, as each letter is equally likely to appear first. Then, given we start with $O$, the probability we end with $O$ is $\dfrac{1}{7}$, as only one of the $7$ remaining letters is $O$. Thus, each of the two middle terms is $\dfrac{1}{28}$

$$$$

Lastly, $\mathbb{P}[L] = \dfrac{3}{8}$ and $\mathbb{P}[S \mid L] = \dfrac{2}{7}$ by the same logic above. Thus, this first term is $\dfrac{3}{28}$. Adding these all up, $\mathbb{P}[S] = \dfrac{5}{28}$, so the total number of permutations that start and end with the same letter is $\dfrac{5}{28} \cdot 1680= 300$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "300"
    ],
    "companies": [],
    "difficulty": "easy",
    "id": "vHh9KQE1kY9IG6pTAQEE",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 2953922,
    "source": "MAO edited",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Lollipop Mix",
    "topic": "probability",
    "urlEnding": "lollipop-mix"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "vHh9KQE1kY9IG6pTAQEE",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Lollipop Mix",
    "topic": "probability",
    "urlEnding": "lollipop-mix"
  }
}
```
