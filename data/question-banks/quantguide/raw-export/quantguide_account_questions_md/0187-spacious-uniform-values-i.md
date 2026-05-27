# QuantGuide Question

## 187. Spacious Uniform Values I

**Metadata**

- ID: `OVV5sGPNkZmxH3BgmX6y`
- URL: https://www.quantguide.io/questions/spacious-uniform-values-i
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 4
- Companies: Citadel, WorldQuant
- Source: N/A
- Tags: Continuous Random Variables
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-2 09:59:39 America/New_York
- Last Edited By: Gabe

### 题干

You sample 101 uniformly random numbers in the interval $(0,1)$. Find the probability that no two of the values selected are within a distance of $\dfrac{1}{1000}$ of one another. The answer should be in the fully reduced form $\left(\dfrac{a}{b}\right)^c$. Find $a + b + c$.

### Hint

Imagine having a deck of cards of size $m$ and marking $N$ of them. Find the probability that the cards are all at least a distance $d$ apart. Consider this intuition in the limiting case.

### 解答

Consider the following discrete scenario: Imagine having a deck of cards of size $m$ and marking $N$ of them. Find the probability that the marked cards are all at least a distance $d$ apart. If you deal out the cards one-by-one from the top of the deck, each time you obtain a marked card, deal out $d$ cards from the bottom of the deck and put them on top of your marked card you just dealt. All of the marked cards are at least a distance $d$ apart precisely when none of the marked cards were in the bottom $(N-1)d$ cards. If they were, then they would be within $d$ distance of the previous marked card dealt out, as they would lie in the region that we put between two marked cards, which is supposed to have none if the marked cards are to truly be at least $d$ cards apart.

$$$$

Let $m \rightarrow \infty$ in the above example and the intuition for this problem holds. Instead of throwing out $d$ cards, we are going to throw out an interval of length $d$ at each point selected. Thus, we want to find the probability that none of the "marked values" (points) are within the interval of total length $(N-1)d$ that was thrown away. This probability is $1 - (N-1)d$ for each random variable. By independence and there being $N$ such random variables (as we have $N$ such points here), the probability is $(1 - (N-1)d)^N$. In this case, $N = 101$ and $d = \dfrac{1}{1000}$, so this evaluates to $\left(\dfrac{9}{10}\right)^{101}$. By the form of our solution, we want $9 + 10 + 101 = 120$, which is the answer.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "120"
    ],
    "companies": [
      {
        "company": "Citadel"
      },
      {
        "company": "WorldQuant"
      }
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "OVV5sGPNkZmxH3BgmX6y",
    "internalDifficulty": 4,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-2 09:59:39 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1456492,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Spacious Uniform Values I",
    "topic": "probability",
    "urlEnding": "spacious-uniform-values-i",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Citadel"
      },
      {
        "company": "WorldQuant"
      }
    ],
    "difficulty": "hard",
    "id": "OVV5sGPNkZmxH3BgmX6y",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Spacious Uniform Values I",
    "topic": "probability",
    "urlEnding": "spacious-uniform-values-i"
  }
}
```
