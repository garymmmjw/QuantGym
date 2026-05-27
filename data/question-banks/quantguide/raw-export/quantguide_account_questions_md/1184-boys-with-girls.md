# QuantGuide Question

## 1184. Boys with Girls

**Metadata**

- ID: `6jS93Bj8nWKYpJm5nLwC`
- URL: https://www.quantguide.io/questions/boys-with-girls
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: WorldQuant
- Source: Kaushik - Cut the Knot
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: 3
- Last Edited: 2023-11-5 00:12:52 America/New_York
- Last Edited By: Gabe

### 题干

There are $15$ boys and $10$ girls in a class. They line up in a row in random order. What is the expected amount of times a boy and a girl are standing next to each other? Ex: $BGBBGGGBGGBBBBG$ has $7$ occurrences where a boy and girl are next to each other. 


### Hint

Try to find the probability of a boy and girl standing next to each other for each space they can. 

### 解答

Let $\mathbb{E}$ be the expected number of occurances where a boy and girl are standing next to eachother. To solve for a more general case, let $m$ be the number of boys and $n$ be the number of girls. There are $m+n-1$ total spaces a boy could be next to a girl. Thus $\mathbb{E}=(m+n-1)\cdot\mathbb{P}$ where $\mathbb{P}$ is the probability for each of these spots to have a boy next to a girl. 
$$$$
To find $\mathbb{P}$, if we know a boy is next to a girl, there are $\displaystyle{\binom{n+m-2}{n-1}}$ ways to arrange the rest of the boys and girls. We then need to multiply this value by $2$ to account of the different orders of the selected couple (either BG or GB). There are a total of $\displaystyle{\binom{n+m}{n}}$ orderings for the boys and girls. Thus
$$$$
$\mathbb{P}=\frac{2\left(\begin{array}{c}n+m-2 \\ n-1\end{array}\right)}{\left(\begin{array}{c}n+m \\ n\end{array}\right)}=\dfrac{2 n m}{(n+m)(n+m-1)}$
$$$$
Given this value of $\mathbb{P}$, $\mathbb{E}=(m+n-1)\cdot\mathbb{P}=\dfrac{2mn}{m+n}$. With 15 boys and 10 girls, we get $\mathbb{E}=\dfrac{2\cdot15\cdot10}{15+10}=12$


### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "12"
    ],
    "companies": [
      {
        "company": "WorldQuant"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "6jS93Bj8nWKYpJm5nLwC",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-5 00:12:52 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9833493,
    "randomizable": "",
    "source": "Kaushik - Cut the Knot",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Boys with Girls",
    "topic": "probability",
    "urlEnding": "boys-with-girls",
    "version": 3
  },
  "list_summary": {
    "companies": [
      {
        "company": "WorldQuant"
      }
    ],
    "difficulty": "medium",
    "id": "6jS93Bj8nWKYpJm5nLwC",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Boys with Girls",
    "topic": "probability",
    "urlEnding": "boys-with-girls"
  }
}
```
